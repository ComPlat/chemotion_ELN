# frozen_string_literal: true

module InventoryIntegration
  # The canonical inventory record (contract chemotion.inventory/v1), see contract/v1.schema.json.
  module Contract
    ID = 'chemotion.inventory/v1'
    SCHEMA_PATH = File.expand_path('contract/v1.schema.json', __dir__)
    UNITS = %w[kg g mg ug L mL uL mol mmol umol pcs].freeze
    STATUSES = %w[available empty to_order ordered disposed locked unknown].freeze
    EXTENSIONS_MAX_BYTES = 16 * 1024
    CAS_FORMAT = /\A\d{2,7}-\d{2}-\d\z/.freeze
    # Set by the engine, or never mapped: not valid as mapping targets.
    ENGINE_FIELDS = %w[contract version provenance extensions].freeze

    Error = Struct.new(:code, :path, :message, keyword_init: true)

    class << self
      delegate :schema, to: :validator

      # @param record [Hash] canonical record, string or symbol keys
      # @param inbound [Boolean] true for records from external callers, which may not set provenance
      # @return [Array<Error>] empty when the record is valid
      def validate(record, inbound: false)
        data = record.deep_stringify_keys
        errors = validator.validate(data).map do |failure|
          Error.new(code: code_for(failure), path: failure.path, message: failure.message)
        end
        errors.concat(semantic_errors(data, inbound))
      end

      def valid?(record, inbound: false)
        validate(record, inbound: inbound).empty?
      end

      # CAS registry numbers end in a check digit: the weighted sum of the other digits, mod 10.
      def valid_cas?(cas)
        digits = cas.to_s.delete('-')
        return false unless digits.match?(/\A\d{5,10}\z/)

        body = digits[0..-2].reverse.chars.map(&:to_i)
        body.each_with_index.sum { |digit, index| digit * (index + 1) } % 10 == digits[-1].to_i
      end

      # Dotted leaf paths a mapping may write, e.g. "substance.cas" or "quantity.remaining.unit".
      def target_paths
        @target_paths ||= leaf_paths(schema, '').reject { |path| ENGINE_FIELDS.include?(path.split('.').first) }
      end

      # Leaf schema of a dotted target path, nil when the path is not a target.
      def target_schema(path)
        node = path.split('.').reduce(schema) do |current, key|
          resolve(current)&.fetch('properties', {})&.dig(key)
        end
        node && resolve(node)
      end

      private

      def validator
        @validator ||= InventoryIntegration::SchemaValidator.load(SCHEMA_PATH)
      end

      def code_for(failure)
        return 'contract.unit_unknown' if failure.keyword == 'enum' && failure.path.end_with?('/unit')
        return 'contract.pattern' if failure.keyword == 'pattern'

        'contract.invalid'
      end

      def semantic_errors(data, inbound)
        [cas_error(data), extensions_error(data), (provenance_error if inbound && data.key?('provenance'))].compact
      end

      def cas_error(data)
        cas = data.dig('substance', 'cas')
        return unless cas.is_a?(String) && cas.match?(CAS_FORMAT) && !valid_cas?(cas)

        Error.new(code: 'contract.pattern', path: '/substance/cas', message: 'has a wrong check digit')
      end

      def extensions_error(data)
        return unless data['extensions'] && data['extensions'].to_json.bytesize > EXTENSIONS_MAX_BYTES

        Error.new(code: 'contract.invalid', path: '/extensions', message: 'exceeds 16 KB')
      end

      def provenance_error
        Error.new(code: 'contract.invalid', path: '/provenance', message: 'is set by the engine only')
      end

      def leaf_paths(node, prefix)
        node = resolve(node)
        properties = node['properties']
        return [prefix] unless node['type'] == 'object' && properties

        properties.flat_map do |key, child|
          leaf_paths(child, prefix.empty? ? key : "#{prefix}.#{key}")
        end
      end

      def resolve(node)
        return node unless node.is_a?(Hash) && node['$ref']

        schema.fetch('definitions').fetch(node['$ref'].delete_prefix('#/definitions/'))
      end
    end
  end
end
