# frozen_string_literal: true

module InventoryIntegration
  # Validates data against the JSON Schema draft-07 subset the integration schemas use.
  # An unsupported keyword raises on load, so a schema never silently checks less than it states.
  class SchemaValidator
    KEYWORDS = %w[
      $schema $id $ref title description definitions default examples
      type enum const properties required additionalProperties anyOf
      items minItems maxItems uniqueItems minLength maxLength pattern format
      minimum maximum exclusiveMinimum
    ].freeze
    NAMED_SCHEMAS = %w[properties definitions].freeze
    FORMATS = %w[date date-time uri].freeze
    TYPES = {
      'object' => ->(v) { v.is_a?(Hash) },
      'array' => ->(v) { v.is_a?(Array) },
      'string' => ->(v) { v.is_a?(String) },
      'integer' => ->(v) { v.is_a?(Integer) },
      'number' => ->(v) { v.is_a?(Numeric) },
      'boolean' => ->(v) { [true, false].include?(v) },
      'null' => lambda(&:nil?),
    }.freeze

    Failure = Struct.new(:path, :keyword, :message, keyword_init: true)

    def self.load(path)
      new(JSON.parse(File.read(path)))
    end

    attr_reader :schema

    def initialize(schema)
      @schema = schema
      @patterns = {}
      check_keywords!(schema)
    end

    # @return [Array<Failure>] empty when the data is valid
    def validate(data)
      failures = []
      visit(schema, data, '', failures)
      failures
    end

    private

    def check_keywords!(node, named: false)
      return unless node.is_a?(Hash)
      return node.each_value { |child| check_keywords!(child) } if named

      node.each do |key, value|
        check_keyword!(key, value)
        check_child_keywords!(key, value)
      end
    end

    def check_keyword!(key, value)
      raise ArgumentError, "unsupported schema keyword '#{key}'" unless KEYWORDS.include?(key) || key.start_with?('x-')
      raise ArgumentError, "unsupported format '#{value}'" if key == 'format' && FORMATS.exclude?(value)
    end

    def check_child_keywords!(key, value)
      if NAMED_SCHEMAS.include?(key)
        check_keywords!(value, named: true)
      elsif %w[items additionalProperties].include?(key)
        check_keywords!(value)
      elsif key == 'anyOf'
        value.each { |sub| check_keywords!(sub) }
      end
    end

    def resolve(node)
      ref = node['$ref']
      return node unless ref

      name = ref.delete_prefix('#/definitions/')
      raise ArgumentError, "unsupported $ref '#{ref}'" if name == ref

      schema.fetch('definitions').fetch(name)
    end

    def visit(node, data, path, failures)
      node = resolve(node)
      return unless type_valid?(node, data, path, failures)

      check_value(node, data, path, failures)
      check_any_of(node, data, path, failures)
      case data
      when Hash then check_object(node, data, path, failures)
      when Array then check_array(node, data, path, failures)
      when String then check_string(node, data, path, failures)
      when Numeric then check_number(node, data, path, failures)
      end
    end

    def type_valid?(node, data, path, failures)
      types = Array(node['type'])
      return true if types.empty? || types.any? { |type| TYPES.fetch(type).call(data) }

      failures << Failure.new(path: path, keyword: 'type', message: "must be #{types.join(' or ')}")
      false
    end

    def check_value(node, data, path, failures)
      if node.key?('const') && node['const'] != data
        failures << Failure.new(path: path, keyword: 'const', message: "must be #{node['const'].inspect}")
      end
      return unless node.key?('enum') && node['enum'].exclude?(data)

      message = "#{data.inspect} is not one of #{node['enum'].join(', ')}"
      failures << Failure.new(path: path, keyword: 'enum', message: message)
    end

    def check_any_of(node, data, path, failures)
      return unless node['anyOf']
      return if node['anyOf'].any? { |sub| validate_sub(sub, data, path).empty? }

      failures << Failure.new(path: path, keyword: 'anyOf', message: 'matches none of the allowed forms')
    end

    def validate_sub(sub, data, path)
      sub_failures = []
      visit(sub, data, path, sub_failures)
      sub_failures
    end

    def check_object(node, data, path, failures)
      Array(node['required']).each do |key|
        next if data.key?(key)

        failures << Failure.new(path: "#{path}/#{key}", keyword: 'required', message: 'is required')
      end
      properties = node['properties'] || {}
      data.each do |key, value|
        child = "#{path}/#{key}"
        if properties.key?(key)
          visit(properties[key], value, child, failures)
        else
          check_additional(node['additionalProperties'], value, child, failures)
        end
      end
    end

    def check_additional(additional, value, path, failures)
      case additional
      when false then failures << Failure.new(path: path, keyword: 'additionalProperties', message: 'is not allowed')
      when Hash then visit(additional, value, path, failures)
      end
    end

    def check_array(node, data, path, failures)
      failures.concat(bound_failures(data.size, node['minItems'], node['maxItems'], 'items', path))
      if node['uniqueItems'] && data.uniq.size != data.size
        failures << Failure.new(path: path, keyword: 'uniqueItems', message: 'must not repeat items')
      end
      return unless node['items']

      data.each_with_index { |item, index| visit(node['items'], item, "#{path}/#{index}", failures) }
    end

    def check_string(node, data, path, failures)
      failures.concat(bound_failures(data.length, node['minLength'], node['maxLength'], 'characters', path))
      if node['pattern'] && !pattern(node['pattern']).match?(data)
        failures << Failure.new(path: path, keyword: 'pattern', message: "does not match #{node['pattern']}")
      end
      return unless node['format'] && !valid_format?(node['format'], data)

      failures << Failure.new(path: path, keyword: 'format', message: "is not a valid #{node['format']}")
    end

    def check_number(node, data, path, failures)
      if node['minimum'] && data < node['minimum']
        failures << Failure.new(path: path, keyword: 'minimum', message: "must be >= #{node['minimum']}")
      end
      if node['exclusiveMinimum'] && data <= node['exclusiveMinimum']
        message = "must be > #{node['exclusiveMinimum']}"
        failures << Failure.new(path: path, keyword: 'exclusiveMinimum', message: message)
      end
      return unless node['maximum'] && data > node['maximum']

      failures << Failure.new(path: path, keyword: 'maximum', message: "must be <= #{node['maximum']}")
    end

    def bound_failures(size, min, max, unit, path)
      found = []
      found << Failure.new(path: path, keyword: 'min', message: "needs at least #{min} #{unit}") if min && size < min
      found << Failure.new(path: path, keyword: 'max', message: "allows at most #{max} #{unit}") if max && size > max
      found
    end

    def pattern(source)
      @patterns[source] ||= Regexp.new(source)
    end

    def valid_format?(format, value)
      case format
      when 'date' then Date.iso8601(value) && true
      when 'date-time' then Time.iso8601(value) && true
      else valid_uri?(value)
      end
    rescue ArgumentError
      false
    end

    def valid_uri?(value)
      uri = URI.parse(value)
      %w[http https].include?(uri.scheme) && uri.host.present?
    rescue URI::InvalidURIError
      false
    end
  end
end
