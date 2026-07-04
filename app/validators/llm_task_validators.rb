# frozen_string_literal: true

# Lightweight validators for LLM task JSON output.
#
# Each validator receives the parsed JSON (Hash or Array) returned by the model
# and either returns it unchanged (possibly after normalisation) or raises
# LlmTaskValidators::ValidationError if the output is structurally invalid.
#
# Validators are referenced by class name string in each task's YAML:
#   validator_class: "LlmTaskValidators::SdsExtractionValidator"
#
# All validators implement the same interface:
#   LlmTaskValidators::SomeName.validate!(parsed_hash)  # => hash or raises
#
module LlmTaskValidators
  # Raised when the model's JSON output does not meet the task's structural requirements.
  class ValidationError < StandardError; end

  # ── Base validator ──────────────────────────────────────────────────────────

  class Base
    # Class-level entry point — instantiates and delegates to instance method.
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
    def validate!(data)
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
  end

  # ── Passthrough validator ───────────────────────────────────────────────────
  # Used when a task declares no validator_class, or for tasks where any
  # non-empty hash/string is acceptable.

  class PassthroughValidator < Base
    def validate!(data)
      data
    end
  end

  # ── Extraction validators ───────────────────────────────────────────────────

  class SdsExtractionValidator < Base
    # Require at least one meaningful safety field.
    # Note: cas_number is optional because mixture SDS files have no single CAS.
    CORE_KEYS = %w[chemical_name cas_number hazard_statements ghs_codes signal_word properties mixture_components].freeze

    def validate!(data)
      require_hash!(data)
      require_any_of!(data, *CORE_KEYS)
      normalise_p_statements!(data)
      data
    end

    private

    # Normalise combined P-statement codes that may appear with spaces around
    # the "+" in the source PDF (e.g. "P301 + P312" → "P301+P312").
    def normalise_p_statements!(data)
      return unless data['precautionary_statements'].is_a?(Array)

      data['precautionary_statements'] = data['precautionary_statements'].map do |code|
        code.to_s.gsub(/\s*\+\s*/, '+').strip
      end
    end
  end

  class NmrStructuringValidator < Base
    def validate!(data)
      require_hash!(data)
      require_any_of!(data, 'assignments', 'nucleus', 'shifts', 'peaks')
      data
    end
  end

  class MsExtractionValidator < Base
    def validate!(data)
      require_hash!(data)
      require_any_of!(data, 'molecular_ion', 'fragments', 'base_peak', 'technique')
      data
    end
  end

  class HplcExtractionValidator < Base
    def validate!(data)
      require_hash!(data)
      require_any_of!(data, 'peaks', 'purity_percent', 'method')
      data
    end
  end

  class StoichiometryCheckValidator < Base
    def validate!(data)
      require_hash!(data)
      require_any_of!(data, 'balanced', 'limiting_reagent', 'theoretical_yield_mg', 'issues')
      data
    end
  end

  class StructureSpectrumCheckValidator < Base
    def validate!(data)
      require_hash!(data)
      require_any_of!(data, 'consistent', 'confirmed_features', 'inconsistencies')
      data
    end
  end
end
