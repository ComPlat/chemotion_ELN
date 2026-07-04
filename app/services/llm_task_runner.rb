# frozen_string_literal: true

# Orchestrates a single LLM task execution end-to-end.
#
# Workflow:
#   1. Look up the task definition in LlmTaskRegistry
#   2. Resolve the LLM provider/model for this user + task (SF-01/02/03)
#   3. Build system + user prompt messages
#   4. Call LlmClient#chat with the task's parameters
#   5. Parse JSON output (for json-output tasks) — stripping any markdown fences
#   6. Validate the parsed result via the task's validator_class (if specified)
#   7. Write an audit log entry (always — success or failure)
#   8. Return the validated result
#
# Usage:
#   # Simple call — passes context text only
#   result = LlmTaskRunner.run(
#     task_name: 'sds_extraction',
#     user:      current_user,
#     context:   sds_text,
#   )
#
#   # Call with extra template variables
#   result = LlmTaskRunner.run(
#     task_name: 'research_assistant',
#     user:      current_user,
#     context:   reaction_summary,
#     question:  'What reagent should I use to protect this amine?',
#   )
#
# Error handling:
#   Errors::LlmNotConfiguredError  — no provider found for user
#   Errors::LlmProviderError       — provider HTTP/parse error
#   Errors::LlmTimeoutError        — request timed out
#   LlmTaskValidators::ValidationError — model output failed validation (wrapped in LlmProviderError)
#
class LlmTaskRunner
  # Convenience class-level entry point.
  #
  # @param task_name [String]
  # @param user      [User]
  # @param context   [String]  Primary context text (substituted for {{context}})
  # @param params    [Hash]    Additional template variables (e.g. question:, structure:)
  # @return [Hash, String]     Validated JSON hash for json-output tasks; String for text-output tasks
  def self.run(task_name:, user:, context:, **params)
    new(task_name: task_name, user: user, context: context, params: params).run
  end

  def initialize(task_name:, user:, context:, params: {})
    @task_name = task_name.to_s
    @user      = user
    @context   = context.to_s
    @params    = params || {}
  end

  def run
    task       = Chemotion::LlmTaskRegistry.find(@task_name)
    resolution = LlmProviderResolver.resolve(user: @user, task_name: @task_name)

    client = LlmClient.new(
      base_url: resolution.base_url,
      api_key:  resolution.api_key,
      model:    resolution.model,
      timeout:  task.timeout_seconds,
      protocol: resolution.protocol || 'openai',
    )

    messages   = build_messages(task)
    raw_output = client.chat(
      messages:    messages,
      temperature: task.temperature,
      max_tokens:  task.max_tokens,
      json_mode:   task.json_output?,
    )

    result = task.json_output? ? parse_json!(raw_output) : raw_output
    result = apply_validator!(task, result) if task.json_output? && task.validator_class.present?

    LlmAuditLogger.log(user: @user, task: @task_name, resolution: resolution, success: true)

    result
  rescue StandardError => e
    LlmAuditLogger.log(user: @user, task: @task_name, resolution: nil, success: false, error: e)
    raise
  end

  private

  # Build the messages array for LlmClient#chat.
  # Includes system message only when the task defines one.
  def build_messages(task)
    messages = []

    system_content = task.system_prompt
    messages << { role: 'system', content: system_content } if system_content.present?

    user_content = task.render_user_prompt(context: @context, **@params.transform_keys(&:to_sym))
    messages << { role: 'user', content: user_content }

    messages
  end

  # Parse the model's response as JSON.
  # Many models wrap JSON in markdown fences (```json ... ```) even when
  # instructed not to — we strip those before parsing.
  #
  # @param text [String]
  # @return [Hash, Array]
  # @raise [Errors::LlmProviderError]
  def parse_json!(text)
    cleaned = text.to_s.strip

    # Strip leading ```json or ``` fences
    cleaned = cleaned
              .sub(/\A```(?:json)?\s*\n?/, '')
              .sub(/\n?```\z/, '')
              .strip

    JSON.parse(cleaned)
  rescue JSON::ParserError => e
    raise Errors::LlmProviderError,
          "LLM returned invalid JSON for task '#{@task_name}': #{e.message}. " \
          "Raw output (first 300 chars): #{text.to_s[0, 300]}"
  end

  # Resolve and invoke the task's validator class.
  # Gracefully handles missing validator class with a warning.
  #
  # @param task [Chemotion::LlmTaskDefinition]
  # @param data [Hash, Array]
  # @return [Hash, Array]
  # @raise [Errors::LlmProviderError] wrapping ValidationError
  def apply_validator!(task, data)
    task.validator_class.constantize.validate!(data)
  rescue NameError
    Rails.logger.warn(
      "[LlmTaskRunner] Validator class '#{task.validator_class}' not found for task " \
      "'#{@task_name}'. Skipping validation."
    )
    data
  rescue LlmTaskValidators::ValidationError => e
    raise Errors::LlmProviderError,
          "LLM output for task '#{@task_name}' failed validation: #{e.message}"
  end
end
