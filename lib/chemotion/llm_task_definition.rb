# frozen_string_literal: true

module Chemotion
  # Value object wrapping a single LLM task definition loaded from a YAML file.
  #
  # Responsibilities:
  #   - Hold all task metadata (name, prompts, parameters)
  #   - Render the user prompt template by substituting {{variable}} placeholders
  #   - Provide typed accessors with safe defaults
  #
  # Usage:
  #   config = YAML.safe_load(File.read('config/llm_tasks/sds_extraction.yml'))
  #   task   = Chemotion::LlmTaskDefinition.new(config)
  #   task.render_user_prompt(context: sds_text)
  #   # => "Here is the Safety Data Sheet text:\n\n..."
  #
  class LlmTaskDefinition
    REQUIRED_KEYS   = %w[name prompts].freeze
    VALID_EXEC_MODES = %w[inline async].freeze
    VALID_OUTPUT_FORMATS = %w[json text].freeze

    attr_reader :name, :display_name, :description, :category,
                :execution_mode, :output_format, :temperature, :max_tokens,
                :timeout_seconds, :validator_class

    def initialize(config)
      validate_config!(config)

      @name            = config['name'].to_s.strip
      @display_name    = config.fetch('display_name', @name.tr('_', ' ').capitalize).to_s
      @description     = config.fetch('description', '').to_s
      @category        = config.fetch('category', 'general').to_s
      @execution_mode  = config.fetch('execution_mode', 'inline').to_s
      @output_format   = config.fetch('output_format', 'json').to_s
      @temperature     = config.fetch('temperature', 0.1).to_f
      @max_tokens      = config['max_tokens']&.to_i
      @timeout_seconds = config.fetch('timeout_seconds', 120).to_i
      @validator_class = config['validator_class'].presence
      @prompts         = config.fetch('prompts', {})
    end

    # Returns the system prompt string (empty string if not defined).
    #
    # @return [String]
    def system_prompt
      @prompts.fetch('system', '').to_s.strip
    end

    # Render the user prompt template, substituting all {{variable}} placeholders.
    #
    # @param vars [Hash<Symbol|String, #to_s>]  Variables to substitute; must include :context
    # @return [String]  Rendered prompt with all placeholders replaced
    #
    # @example
    #   task.render_user_prompt(context: "SDS text here...")
    #   task.render_user_prompt(context: "spectra...", structure: "c1ccccc1O")
    def render_user_prompt(**vars)
      template = @prompts.fetch('user_template', '').to_s.dup
      vars.each do |key, value|
        template.gsub!("{{#{key}}}", value.to_s)
      end
      # Replace any remaining un-substituted placeholders with empty string
      template.gsub!(/\{\{[^}]+\}\}/, '')
      template.strip
    end

    # Whether this task expects a JSON response from the model.
    #
    # @return [Boolean]
    def json_output?
      @output_format == 'json'
    end

    # Whether this task should be executed asynchronously (e.g. in a background job).
    #
    # @return [Boolean]
    def async?
      @execution_mode == 'async'
    end

    # Summary hash suitable for API serialisation (no prompts).
    #
    # @return [Hash]
    def to_h
      {
        name:           @name,
        display_name:   @display_name,
        description:    @description,
        category:       @category,
        execution_mode: @execution_mode,
        output_format:  @output_format,
      }
    end

    private

    def validate_config!(config)
      raise ArgumentError, 'Task config must be a Hash' unless config.is_a?(Hash)

      REQUIRED_KEYS.each do |key|
        raise ArgumentError, "LLM task YAML missing required key: '#{key}'" unless config.key?(key)
      end

      name = config['name'].to_s.strip
      raise ArgumentError, "LLM task 'name' must not be blank" if name.blank?

      prompts = config['prompts']
      raise ArgumentError, "LLM task 'prompts' must be a Hash" unless prompts.is_a?(Hash)
      raise ArgumentError, "LLM task 'prompts.user_template' is required" unless prompts.key?('user_template')
    end
  end
end
