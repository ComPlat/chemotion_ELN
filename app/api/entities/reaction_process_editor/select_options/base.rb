# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Base
        def self.titlecase_options_for(values)
          Array(values).map do |string|
            { value: string.to_s, label: string.to_s.titlecase }
          end
        end

        def self.strings_to_options(values)
          Array(values).map do |string|
            { value: string.to_s, label: string.to_s }
          end
        end

        def self.samples_options(samples, acts_as)
          samples.map do |sample|
            sample_option(sample, acts_as)
          end
        end

        def self.sample_option(sample, acts_as)
          sample_info_option(sample, acts_as)
        end

        def self.sample_info_option(sample, acts_as)
          {
            id: sample.id,
            value: sample.id,
            # Can we unify this? Using preferred_labels as in most ELN which in turn is an attribute derived from
            # `external_label` but when a sample is saved it gets only it's "short_label" set. This is quite irritating.
            label: sample.preferred_label || sample.short_label,
            amount: {
              value: sample.target_amount_value,
              unit: sample.target_amount_unit,
            },
            unit_amounts: {
              mmol: sample.amount_mmol,
              mg: sample.amount_mg,
              ml: sample.amount_ml,
            },
            sample_svg_file: sample&.sample_svg_file,
            acts_as: acts_as,
          }
        end
      end
    end
  end
end
