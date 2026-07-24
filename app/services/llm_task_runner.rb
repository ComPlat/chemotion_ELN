# frozen_string_literal: true

# Orchestrates a single LLM task execution end-to-end.
#
# Workflow:
#   1. Look up the task definition in LlmTaskRegistry
#   2. Resolve the LLM provider/model for this user + task
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

  # The provider resolution that actually SERVED the most recent #run (nil until
  # #run runs). After a fallback this is the default-model resolution, not the
  # originally-requested one. Lets callers see which provider/model served the
  # task — e.g. ExtractSdsJob records `resolution.model` in the chemical metadata
  # so the UI can show "Task was performed using <model>".
  attr_reader :resolution

  # The task-specific model that was requested but FAILED, when #run fell back to
  # the default model. nil when no fallback happened.
  attr_reader :requested_model

  def initialize(task_name:, user:, context:, params: {})
    @task_name       = task_name.to_s
    @user            = user
    @context         = context.to_s
    @params          = params || {}
    @resolution      = nil
    @requested_model = nil
    @fell_back       = false
  end

  # The model string that served the most recent #run (nil until #run runs).
  def model_used
    @resolution&.model
  end

  # True when the task-specific model failed and #run fell back to the default
  # model. When true, #requested_model holds the originally-requested model.
  def fell_back?
    @fell_back
  end

  def run
    task        = Chemotion::LlmTaskRegistry.find(@task_name)
    @resolution = LlmProviderResolver.resolve(user: @user, task_name: @task_name)

    client, raw_output = execute_with_fallback(task)

    result = task.json_output? ? parse_json!(raw_output, client.last_finish_reason) : raw_output
    result = apply_validator!(task, result) if task.json_output? && task.validator_class.present?

    LlmAuditLogger.log(user: @user, task: @task_name, resolution: @resolution, success: true)

    result
  rescue StandardError => e
    # Pass @resolution (whichever model served last; nil if resolution itself
    # failed) so the audit trail records WHICH model failed, not just that the
    # task failed.
    LlmAuditLogger.log(user: @user, task: @task_name, resolution: @resolution, success: false, error: e)
    raise
  end

  private

  # Call the resolved (task-specific) model. If it fails with a provider/transport
  # error AND a *different* default model is available, retry once on the default
  # model. This makes a task-specific model choice resilient: if the chosen model
  # is unavailable (e.g. HTTP 503 "high demand"), rate-limited, or times out, the
  # task still completes on the institution/user default instead of failing.
  #
  # @resolution is updated to whichever model actually served the request, so
  # #model_used / the audit log / the stored metadata all reflect reality.
  #
  # @return [Array(LlmClient, String)] the client that served the request and its raw output
  def execute_with_fallback(task)
    primary = @resolution
    client  = build_client(task, primary)
    [client, call_model(task, client)]
  rescue Errors::LlmProviderError, Errors::LlmTimeoutError, Errors::LlmRateLimitError => e
    fallback = default_fallback_resolution
    # No point retrying the same model (e.g. when there is no task-specific
    # override, primary already IS the default) — re-raise the original error.
    raise if fallback.nil? || fallback.model == primary.model

    Rails.logger.warn(
      "[LlmTaskRunner] task '#{@task_name}' model '#{primary.model}' failed " \
      "(#{e.class}: #{e.message}); falling back to the default model '#{fallback.model}'.",
    )
    @requested_model = primary.model
    @fell_back       = true
    @resolution      = fallback

    client = build_client(task, fallback)
    [client, call_model(task, client)]
  end

  # The user/global default resolution, IGNORING any task-specific mapping — the
  # fallback target when the task-specific model is unavailable. Returns nil when
  # no provider is configured at all.
  def default_fallback_resolution
    LlmProviderResolver.resolve(user: @user, task_name: nil)
  rescue Errors::LlmNotConfiguredError
    nil
  end

  def build_client(task, resolution)
    LlmClient.new(
      base_url: resolution.base_url,
      api_key: resolution.api_key,
      model: resolution.model,
      timeout: task.timeout_seconds,
      protocol: resolution.protocol || 'openai',
    )
  end

  # Send the chat request for +task+ on +client+ and return the raw output.
  #
  # Empty output from a JSON task almost always means the model was cut off at the
  # token limit (finish_reason 'length') — common when a reasoning model burns its
  # budget before emitting JSON, especially on long SDS documents. Retry once with
  # a larger cap (same model) before giving up.
  def call_model(task, client)
    messages   = build_messages(task)
    raw_output = client.chat(
      messages:    messages,
      temperature: task.temperature,
      max_tokens:  task.max_tokens,
      json_mode:   task.json_output?,
    )

    if task.json_output? && raw_output.to_s.strip.empty?
      bumped = [task.max_tokens.to_i * 2, 16_000].min
      bumped = 16_000 if bumped <= task.max_tokens.to_i
      Rails.logger.warn(
        "[LlmTaskRunner] Empty output for '#{@task_name}' " \
        "(finish_reason=#{client.last_finish_reason.inspect}); retrying once with max_tokens=#{bumped}.",
      )
      raw_output = client.chat(
        messages:    messages,
        temperature: task.temperature,
        max_tokens:  bumped,
        json_mode:   task.json_output?,
      )
    end

    raw_output
  end

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
  # Robust to two common failure modes:
  #   * markdown fences (```json ... ```) even when told not to — stripped
  #   * prose wrapped around the JSON object — the outermost {...}/[...] is extracted
  # A blank response (usually a token-limit truncation) raises a clear, actionable
  # error instead of a cryptic "unexpected end of input".
  #
  # @param text          [String]
  # @param finish_reason [String, nil]  from LlmClient#last_finish_reason
  # @return [Hash, Array]
  # @raise [Errors::LlmProviderError]
  def parse_json!(text, finish_reason = nil)
    cleaned = strip_fences(text)

    if cleaned.empty?
      cutoff = finish_reason.to_s == 'length'
      reason = cutoff ? "the response was cut off at the token limit (finish_reason='length')" \
                      : 'the model returned no content'
      raise Errors::LlmProviderError,
            "LLM returned an empty response for task '#{@task_name}' — #{reason}. " \
            'This usually means a reasoning model spent its whole token budget before emitting JSON. ' \
            "Increase the task's max_tokens or use a non-reasoning model."
    end

    JSON.parse(cleaned)
  rescue JSON::ParserError => e
    # Fallback: some models add a sentence or two around the JSON — pull out the
    # outermost object/array and try once more before failing.
    snippet = extract_json_span(cleaned)
    if snippet
      begin
        return JSON.parse(snippet)
      rescue JSON::ParserError
        # fall through to the error below
      end
    end
    raise Errors::LlmProviderError,
          "LLM returned invalid JSON for task '#{@task_name}': #{e.message}. " \
          "Raw output (first 300 chars): #{text.to_s[0, 300]}"
  end

  # Strip surrounding whitespace and a single ```json / ``` fence pair.
  def strip_fences(text)
    text.to_s.strip
        .sub(/\A```(?:json)?\s*\n?/, '')
        .sub(/\n?```\z/, '')
        .strip
  end

  # Extract the outermost JSON object or array substring from a blob that may
  # have leading/trailing prose. Returns nil when no plausible span is found.
  def extract_json_span(text)
    [['{', '}'], ['[', ']']].each do |open_char, close_char|
      s = text.index(open_char)
      e = text.rindex(close_char)
      return text[s..e] if s && e && e > s
    end
    nil
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
