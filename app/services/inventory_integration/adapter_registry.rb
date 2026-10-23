# frozen_string_literal: true

module InventoryIntegration
  # Adapter classes installed on this server. The IT config decides which of them are enabled.
  # Adapter gems register through ActiveSupport.on_load(:inventory_integration_adapters).
  class AdapterRegistry
    BUILT_IN = [].freeze
    KEY = /\A[a-z][a-z0-9_]{1,40}\z/.freeze
    SEMVER = /\A\d+\.\d+\.\d+\z/.freeze
    SETTING_TYPES = %w[string integer number boolean].freeze
    REQUIRED_MANIFEST_KEYS = %i[key name version contracts capabilities change_detection mapping settings_schema].freeze
    # Resolved here, in the class body: classic autoloading cannot resolve them from `class << self`.
    BASE = Adapters::Base
    CONTRACT_ID = Contract::ID

    class InvalidAdapter < StandardError; end

    class << self
      def register(klass)
        manifest = validate!(klass)
        key = manifest[:key]
        existing = adapters[key]
        raise InvalidAdapter, "adapter key '#{key}' is already taken by #{existing}" if existing && existing != klass

        adapters[key] = klass
      end

      def key?(key)
        adapters.key?(key.to_s)
      end

      def find(key)
        adapters.fetch(key.to_s)
      end

      def all
        adapters.values
      end

      def enabled(config = InventoryIntegration::IntegrationConfig.current)
        config.enabled_adapter_keys.filter_map { |key| adapters[key] }
      end

      def reset!
        @adapters = nil
      end

      # @return [Hash] the manifest, when it passes every check
      def validate!(klass)
        raise InvalidAdapter, "#{klass} is not an inventory adapter" unless klass.is_a?(Class) && klass < BASE

        manifest = klass.manifest
        problems = manifest_problems(manifest) + capability_problems(klass, manifest)
        raise InvalidAdapter, "#{klass}: #{problems.join('; ')}" if problems.any?

        manifest
      end

      private

      def adapters
        @adapters ||= load_adapters
      end

      def load_adapters
        @adapters = {}
        BUILT_IN.each { |name| register(name.constantize) }
        ActiveSupport.run_load_hooks(:inventory_integration_adapters, self)
        @adapters
      end

      def manifest_problems(manifest)
        return ['manifest must be a Hash'] unless manifest.is_a?(Hash)

        missing = REQUIRED_MANIFEST_KEYS - manifest.keys
        return ["manifest misses #{missing.join(', ')}"] if missing.any?

        identity_problems(manifest) + behaviour_problems(manifest) +
          settings_schema_problems(manifest[:settings_schema])
      end

      def identity_problems(manifest)
        problems = []
        problems << "key '#{manifest[:key]}' must match #{KEY.source}" unless manifest[:key].to_s.match?(KEY)
        problems << 'name is blank' if manifest[:name].blank?
        problems << 'version must be MAJOR.MINOR.PATCH' unless manifest[:version].to_s.match?(SEMVER)
        problems << "contracts must include #{CONTRACT_ID}" unless Array(manifest[:contracts]).include?(CONTRACT_ID)
        problems
      end

      def behaviour_problems(manifest)
        allowed_values = { change_detection: BASE::CHANGE_DETECTION, mapping: BASE::MAPPING_MODES }
        allowed_values.filter_map do |field, allowed|
          "#{field} must be one of #{allowed.join(', ')}" unless allowed.include?(manifest[field])
        end
      end

      def capability_problems(klass, manifest)
        capabilities = Array(manifest[:capabilities])
        unknown = capabilities - BASE::CAPABILITIES
        return ["unknown capabilities: #{unknown.join(', ')}"] if unknown.any?

        capabilities.filter_map do |capability|
          method = BASE::CAPABILITY_METHODS.fetch(capability)
          next if klass.method_defined?(method) && klass.instance_method(method).owner != BASE

          "capability #{capability} declared but #{method} is not implemented"
        end
      end

      def settings_schema_problems(schema)
        schema = schema.to_h.deep_stringify_keys
        InventoryIntegration::SchemaValidator.new(schema)
        return ['settings_schema must be an object schema'] unless schema['type'] == 'object'

        schema.fetch('properties', {}).filter_map do |name, property|
          next if SETTING_TYPES.include?(property['type']) || property.key?('enum')

          "setting '#{name}' must be one of #{SETTING_TYPES.join(', ')} or an enum"
        end
      rescue ArgumentError => e
        ["settings_schema: #{e.message}"]
      end
    end
  end
end
