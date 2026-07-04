# frozen_string_literal: true

module Chemotion
  # Registry that loads all LLM task definitions from config/llm_tasks/*.yml
  # and provides fast name-based lookup.
  #
  # Tasks are loaded once and memoised at class level. Call `reload!` in tests
  # or after adding new task files without restarting Rails.
  #
  # Usage:
  #   task = Chemotion::LlmTaskRegistry.find('sds_extraction')
  #   task.display_name   # => "SDS Safety Data Extraction"
  #
  #   Chemotion::LlmTaskRegistry.names
  #   # => ["hplc_extraction", "nmr_structuring", "sds_extraction", ...]
  #
  class LlmTaskRegistry
    TASKS_DIR = Rails.root.join('config', 'llm_tasks')

    class << self
      # Returns all loaded task definitions indexed by task name.
      #
      # @return [Hash{String => LlmTaskDefinition}]
      def all
        @registry ||= load_all
      end

      # Find a task definition by name.
      #
      # @param name [String, Symbol]
      # @return [LlmTaskDefinition]
      # @raise [ArgumentError] if no task with that name is registered
      def find(name)
        task = all[name.to_s]
        raise ArgumentError, "Unknown LLM task: '#{name}'. " \
          "Available tasks: #{all.keys.sort.join(', ')}" unless task

        task
      end

      # Returns all registered task names (sorted).
      #
      # @return [Array<String>]
      def names
        all.keys.sort
      end

      # Clears the memoised registry. Useful in tests and development
      # when YAML files change without a Rails restart.
      def reload!
        @registry = nil
      end

      private

      def load_all
        pattern = TASKS_DIR.join('*.yml')
        paths   = Dir[pattern].sort

        if paths.empty?
          Rails.logger.warn(
            "[LlmTaskRegistry] No task YAML files found in #{TASKS_DIR}. " \
            'Create config/llm_tasks/*.yml to register tasks.'
          )
        end

        paths.each_with_object({}) do |path, hash|
          load_file(path, hash)
        end
      end

      def load_file(path, hash)
        raw    = File.read(path)
        config = YAML.safe_load(raw, permitted_classes: [Symbol])

        unless config.is_a?(Hash)
          Rails.logger.error("[LlmTaskRegistry] Skipping #{path}: YAML did not parse to a Hash")
          return
        end

        task = Chemotion::LlmTaskDefinition.new(config)

        if hash.key?(task.name)
          Rails.logger.warn(
            "[LlmTaskRegistry] Duplicate task name '#{task.name}' in #{path}. " \
            'Earlier definition kept.'
          )
          return
        end

        hash[task.name] = task
      rescue Psych::SyntaxError => e
        Rails.logger.error("[LlmTaskRegistry] YAML parse error in #{path}: #{e.message}")
      rescue ArgumentError => e
        Rails.logger.error("[LlmTaskRegistry] Invalid task definition in #{path}: #{e.message}")
      end
    end
  end
end
