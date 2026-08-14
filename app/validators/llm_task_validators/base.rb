# frozen_string_literal: true

module LlmTaskValidators
  # Shared assertion and coercion helpers for task validators.
  #
  # Subclasses override #validate!. The guiding rule for all of them: normalise
  # generously, reject only structural nonsense. An LLM that returned usable data
  # in a slightly different shape than the prompt asked for should be repaired
  # here, not thrown away — a rejection costs the user a whole re-run.
  class Base
    # Class-level entry point — instantiates and delegates to the instance method.
    #
    # @param data [Object] Parsed JSON value (usually a Hash)
    # @return [Object] The data, possibly normalised
    # @raise [ValidationError]
    def self.validate!(data)
      new.validate!(data)
    end

    # @param data [Object]
    # @return [Object]
    # @raise [ValidationError]
    def validate!(_data)
      raise NotImplementedError, "#{self.class}#validate! not implemented"
    end

    protected

    # Asserts data is a Hash.
    def require_hash!(data)
      return if data.is_a?(Hash)

      raise ValidationError,
            "Expected a JSON object (Hash), got #{data.class}. " \
            "Check the model's response format."
    end

    # Asserts at least one of the given keys is present and non-empty.
    def require_any_of!(data, *keys)
      present = keys.any? do |k|
        v = data[k.to_s]
        v.present? || v == false # allow boolean false as a valid value
      end
      return if present

      raise ValidationError,
            "LLM output must contain at least one of: #{keys.join(', ')}. " \
            "Got keys: #{data.keys.inspect}"
    end

    # Asserts all given keys are present and non-nil.
    def require_keys!(data, *keys)
      missing = keys.map(&:to_s).reject { |k| data.key?(k) }
      return if missing.empty?

      raise ValidationError, "LLM output missing required keys: #{missing.join(', ')}"
    end

    # Force a field that should be a list into one. Models routinely answer a
    # single-element list as a bare scalar ("H225" instead of ["H225"]), which
    # would otherwise blow up on the first .map downstream. Drops blanks.
    def coerce_array!(data, key)
      key = key.to_s
      return unless data.key?(key)

      value = data[key]
      data[key] = case value
                  when Array then value
                  when nil   then []
                  else            [value]
                  end
      data[key] = data[key].reject { |v| v.respond_to?(:blank?) ? v.blank? : v.nil? }
    end

    # Drop a field whose value is the wrong container type, rather than failing the
    # whole extraction: every field in these tasks is optional by design, so a
    # malformed one is better omitted than left to break a downstream reader.
    def drop_unless_type!(data, key, type)
      key = key.to_s
      return unless data.key?(key)
      return if data[key].is_a?(type)

      Rails.logger.warn(
        "[#{self.class.name}] dropping '#{key}': expected #{type}, got #{data[key].class}",
      )
      data.delete(key)
    end
  end
end
