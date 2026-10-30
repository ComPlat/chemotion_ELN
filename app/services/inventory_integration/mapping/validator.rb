# frozen_string_literal: true

module InventoryIntegration
  module Mapping
    # Validates a mapping profile and, for generic REST, its request settings, before they are saved.
    class Validator
      MAPPING_SCHEMA_PATH = File.expand_path('mapping.schema.json', __dir__)
      REST_SCHEMA_PATH = File.expand_path('rest_settings.schema.json', __dir__)
      INVERTIBLE_TRANSFORMS = %w[trim number decimal_comma integer].freeze
      TEMPLATE = /\{\{(.*?)\}\}/.freeze
      TEMPLATE_VARIABLE = /\A(settings\.[a-z][a-z0-9_]*|external_id|cursor|since)\z/.freeze
      AUTH_PARAMS = {
        'header' => %w[name secret],
        'query' => %w[name secret],
        'bearer' => %w[secret],
        'basic' => %w[user_secret password_secret],
      }.freeze
      PAGINATION_PARAMS = {
        'page' => %w[page_param],
        'offset' => %w[offset_param limit_param],
        'cursor' => %w[cursor_param cursor_path],
      }.freeze

      Error = Struct.new(:code, :path, :message, keyword_init: true)

      class << self
        def mapping_schema
          @mapping_schema ||= InventoryIntegration::SchemaValidator.load(MAPPING_SCHEMA_PATH)
        end

        def rest_schema
          @rest_schema ||= InventoryIntegration::SchemaValidator.load(REST_SCHEMA_PATH)
        end
      end

      # @param mapping [Hash] a chemotion.inventory.mapping/v1 profile
      # @param request_settings [Hash, nil] chemotion.inventory.rest/v1 settings of a generic REST connection
      def initialize(mapping:, request_settings: nil)
        @mapping = mapping.to_h.deep_stringify_keys
        @settings = request_settings&.to_h&.deep_stringify_keys
      end

      def valid?
        errors.empty?
      end

      # @return [Array<Error>]
      def errors
        @errors ||= mapping_errors + rest_errors
      end

      private

      def mapping_errors
        found = schema_errors(self.class.mapping_schema, @mapping, '/mapping')
        return found unless found.empty?

        target_errors + vocabulary_errors + writable_errors
      end

      def rest_errors
        return [] unless @settings

        found = schema_errors(self.class.rest_schema, @settings, '/request_settings')
        return found unless found.empty?

        auth_errors + pagination_errors + template_errors
      end

      def schema_errors(validator, data, prefix)
        validator.validate(data).map do |failure|
          Error.new(code: 'mapping.invalid', path: "#{prefix}#{failure.path}", message: failure.message)
        end
      end

      def fields
        @mapping['fields']
      end

      def target_errors
        found = fields.filter_map do |target, rule|
          if InventoryIntegration::Contract.target_paths.exclude?(target)
            error('mapping.unknown_target', "/mapping/fields/#{target}", 'is not a field of the record contract')
          elsif !rule.key?('from') && !rule.key?('default')
            error('mapping.invalid', "/mapping/fields/#{target}", 'needs a from path or a default')
          end
        end
        return found if fields.key?('substance.name') || fields.key?('substance.cas')

        found << error('mapping.required_missing', '/mapping/fields', 'must map substance.name or substance.cas')
      end

      # Unit, status and other enumerated targets only accept values from the contract's vocabulary.
      def vocabulary_errors
        fields.filter_map do |target, rule|
          allowed = InventoryIntegration::Contract.target_schema(target)&.dig('enum')
          next unless allowed

          values = rule.fetch('map', {}).values.compact
          values << rule['default'] if rule.key?('default') && !rule['default'].nil?
          wrong = values.uniq - allowed
          next if wrong.empty?

          message = "maps to #{wrong.join(', ')}; allowed: #{allowed.join(', ')}"
          error('mapping.vocabulary', "/mapping/fields/#{target}", message)
        end
      end

      def writable_errors
        @mapping.fetch('writable', {}).keys.filter_map do |key|
          rules = fields.select { |target, _| target == key || target.start_with?("#{key}.") }
          next error('mapping.not_reversible', "/mapping/writable/#{key}", 'is not mapped') if rules.empty?

          blocked = rules.keys.reject { |target| reversible?(target, key) }
          next if blocked.empty?

          error('mapping.not_reversible', "/mapping/writable/#{key}",
                "#{blocked.join(', ')} cannot be derived backwards; give an explicit reverse")
        end
      end

      def reversible?(target, writable_key)
        reverse = @mapping.fetch('reverse', {})
        return true if reverse.key?(target) || reverse.key?(writable_key)

        rule = fields[target]
        rule['from'].is_a?(String) && invertible_transforms?(rule) && injective_map?(rule)
      end

      def invertible_transforms?(rule)
        Array(rule['transform']).all? do |transform|
          INVERTIBLE_TRANSFORMS.include?(transform) ||
            (transform.is_a?(Hash) && transform.dig('split', 'separators')&.size == 1)
        end
      end

      def injective_map?(rule)
        map = rule['map']
        return true unless map

        values = map.values.compact
        map.exclude?('*') && values.uniq.size == values.size
      end

      def auth_errors
        auth = @settings['auth']
        missing = AUTH_PARAMS.fetch(auth['type'], []).reject { |key| auth[key].present? }
        return [] if missing.empty?

        [error('mapping.auth_incomplete', '/request_settings/auth', "#{auth['type']} needs #{missing.join(', ')}")]
      end

      def pagination_errors
        pagination = @settings['pagination']
        style = pagination['style']
        missing = PAGINATION_PARAMS.fetch(style, []).reject { |key| pagination[key].present? }
        if style == 'next_link' && pagination['next_link_path'].blank? && !pagination['link_header']
          missing << 'next_link_path or link_header'
        end
        return [] if missing.empty?

        [error('mapping.pagination_incomplete', '/request_settings/pagination', "#{style} needs #{missing.join(', ')}")]
      end

      # Paths stay relative to the connection's base URL; templates only fill known variables.
      def template_errors
        templated_strings.flat_map do |path, value|
          found = []
          if value.start_with?('//')
            found << error('mapping.template_invalid', path, 'must be relative to the base URL')
          end
          value.scan(TEMPLATE).flatten.each do |variable|
            next if variable.strip.match?(TEMPLATE_VARIABLE)

            found << error('mapping.template_invalid', path, "uses unknown template variable '#{variable}'")
          end
          found
        end
      end

      def templated_strings
        list = @settings['list']
        strings = { '/request_settings/list/path' => list['path'] }
        list.fetch('query', {}).each { |key, value| strings["/request_settings/list/query/#{key}"] = value }
        strings['/request_settings/detail/path'] = @settings.dig('detail', 'path') if @settings['detail']
        @settings.fetch('headers', {}).each { |key, value| strings["/request_settings/headers/#{key}"] = value }
        strings
      end

      def error(code, path, message)
        Error.new(code: code, path: path, message: message)
      end
    end
  end
end
