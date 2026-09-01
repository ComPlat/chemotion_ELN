# frozen_string_literal: true

module LlmTaskValidators
  # Validates and normalises the output of the sds_extraction task
  # (config/llm_tasks/sds_extraction.yml).
  #
  # The task prompt asks for GHS/hazard codes in canonical form ("H225",
  # "EUH001", "P301+P312", "GHS06") and omits any field it cannot fill. Models
  # comply loosely: codes come back spaced ("H 225"), lower-cased, or with the
  # statement text appended ("H225: Highly flammable liquid and vapour"), and a
  # single-element list arrives as a bare string. All of that is repaired here,
  # because every consumer downstream treats these as exact codes:
  #   - ChemicalsService.construct_pictograms looks up "GHS06" as a hash key
  #   - the safety-phrase editor and the H/P renderers match on the code
  # A code that arrives as "h 225" would silently render nothing at all.
  #
  # Only genuinely unusable output is rejected: a non-Hash, or a Hash with none
  # of the core safety fields. Fields of the wrong container type are dropped
  # (they are all optional by design) rather than failing the whole extraction,
  # which for an async SDS job would cost the user a full re-run.
  class SdsExtractionValidator < Base
    # At least one of these must be present for the extraction to be worth saving.
    # cas_number is optional because a mixture SDS has no single CAS.
    CORE_KEYS = %w[chemical_name cas_number hazard_statements ghs_codes signal_word properties
                   mixture_components].freeze

    # Fields the prompt declares as lists.
    LIST_KEYS = %w[hazard_statements hazard_statement_texts eu_h_statements
                   precautionary_statements precautionary_statement_texts
                   classification_categories ghs_codes mixture_components].freeze

    # key => matcher for the canonical code at the start of the value.
    CODE_PATTERNS = {
      'hazard_statements' => /\A(EUH\d{3}|H\d{3})/i,
      'eu_h_statements' => /\A(EUH\d{3})/i,
      'precautionary_statements' => /\A(P\d{3}(?:\+P\d{3})*)/i,
      'ghs_codes' => /\A(GHS\d{2})/i,
    }.freeze

    def validate!(data)
      require_hash!(data)
      require_any_of!(data, *CORE_KEYS)

      LIST_KEYS.each { |key| coerce_array!(data, key) }
      CODE_PATTERNS.each { |key, pattern| normalise_codes!(data, key, pattern) }
      normalise_boolean!(data, 'is_mixture')
      drop_unless_type!(data, 'properties', Hash)
      keep_only_hashes!(data, 'mixture_components')

      data
    end

    private

    # Reduce each entry to its canonical code: drop all whitespace (so "H 225"
    # and "P301 + P312" both resolve) and upcase the match. Entries that do not
    # look like a code at all are left untouched — better to hand a consumer an
    # unexpected string it can ignore than to discard real data here.
    def normalise_codes!(data, key, pattern)
      return unless data[key].is_a?(Array)

      data[key] = data[key].filter_map do |entry|
        next if entry.blank?

        compact = entry.to_s.gsub(/\s+/, '')
        match = compact.match(pattern)
        match ? match[1].upcase : entry.to_s.strip
      end.uniq
    end

    # Models sometimes answer a JSON boolean as the string "false"/"true".
    def normalise_boolean!(data, key)
      return unless data.key?(key)

      case data[key].to_s.strip.downcase
      when 'true'  then data[key] = true
      when 'false' then data[key] = false
      end
    end

    # mixture_components must be a list of objects; a stray string entry would
    # break every reader that calls .dig on it.
    def keep_only_hashes!(data, key)
      return unless data[key].is_a?(Array)

      kept = data[key].grep(Hash)
      if kept.size < data[key].size
        Rails.logger.warn(
          "[#{self.class.name}] dropped #{data[key].size - kept.size} non-object " \
          "entr#{(data[key].size - kept.size) == 1 ? 'y' : 'ies'} from '#{key}'",
        )
      end
      data[key] = kept
    end
  end
end
