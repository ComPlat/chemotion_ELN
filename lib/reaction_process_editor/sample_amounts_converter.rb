# frozen_string_literal: true

module ReactionProcessEditor
  class SampleAmountsConverter
    # We need to mimic the ELN metrics semantics. The RPE allows to handle arbitrary units. ELN however requires
    # the unit to be set to the base unit (i.e. 'g', 'l', 'mol') and then have a string named "metrics" with a
    # proprietary letter encoding to determine wether the amount is actually in the base unit ('n'), milli ('m'),
    # micro ('u'), etc. for weight (1st letter), volume (2nd letter), mol (3rd letter), mol/h (4th letter).
    # Pretty hard to handle. cbuggle, 29.10.2024.

    ELN_METRICS = {
      g: { base_unit: 'g', factor: 1, metrics_string: 'nmmm' },
      mg: { base_unit: 'g', factor: 10**3, metrics_string: 'mmmm' },
      mcg: { base_unit: 'g', factor: 10**6, metrics_string: 'ummm' },
      l: { base_unit: 'l', factor: 1, metrics_string: 'mnmm' },
      ml: { base_unit: 'l', factor: 10**3, metrics_string: 'mmmm' },
      mol: { base_unit: 'mol', factor: 1, metrics_string: 'mmnm' },
      mmol: { base_unit: 'mol', factor: 10**3, metrics_string: 'mmmm' },
      mcmol: { base_unit: 'mol', factor: 10**6, metrics_string: 'mmum' },
      nmol: { base_unit: 'mol', factor: 10**9, metrics_string: 'mmum' },
    }.stringify_keys

    QUANTIFIER_POSITION = { g: 0, l: 1, mol: 2 }.stringify_keys
    QUANTIFIER_FACTOR = { n: 1, m: 10**3, u: 10**6 }.stringify_keys
    QUANTIFIER_PREFIXES = { n: '', m: 'm', u: 'mc' }.stringify_keys

    def self.to_eln(workup)
      value = workup.dig('target_amount', 'value') || 0
      eln_metric = ELN_METRICS[workup.dig('target_amount', 'unit')]

      if eln_metric
        value = value.to_f / eln_metric[:factor]
        unit = eln_metric[:base_unit]
        metrics = eln_metric[:metrics_string]
      else
        unit = workup.dig('target_amount', 'unit')
      end
      { value: value, unit: unit, metrics: metrics }
    end

    def self.to_rpe(sample)
      return { value: sample.target_amount_value, unit: sample.target_amount_unit } unless sample.is_a?(Sample)

      quantifier_position = QUANTIFIER_POSITION[sample.target_amount_unit]
      quantifier = sample.metrics && quantifier_position ? sample.metrics[quantifier_position] : 'n'

      factor = QUANTIFIER_FACTOR[quantifier] || 1
      prefix = QUANTIFIER_PREFIXES[quantifier] || ''

      { value: factor * sample.target_amount_value, unit: "#{prefix}#{sample.target_amount_unit}" }
    end
  end
end
