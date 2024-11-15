# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Base
        include Singleton

        def option_for(value)
          { value: value.strip, label: value.strip }
        end

        def options_for(values)
          Array(values).map do |value|
            option_for(value)
          end
        end

        def titlecase_options_for(values)
          Array(values).map do |string|
            { value: string.to_s.strip, label: string.to_s.strip.titlecase }
          end
        end

        def samples_info_options(samples, acts_as)
          samples.map do |sample|
            sample_info_option(sample, acts_as)
          end
        end

        def sample_minimal_options(samples, acts_as)
          samples.map do |sample|
            sample_minimal_option(sample, acts_as)
          end
        end

        def sample_info_option(sample, acts_as)
          return {} unless sample

          sample_minimal_option(sample, acts_as).merge(
            {
              amount: ::ReactionProcessEditor::SampleAmountsConverter.to_rpe(sample),
              unit_amounts: {
                mmol: sample.amount_mmol,
                mg: sample.amount_mg,
                ml: sample.amount_ml,
              },
              sample_svg_file: sample&.sample_svg_file,
              icon: sample&.sample_svg_file,
            },
          )
        end

        def sample_minimal_option(sample, acts_as)
          return {} unless sample

          {
            id: sample.id,
            value: sample.id,
            # Can we unify this? Using preferred_labels as in most ELN which in turn is an attribute derived from
            # `external_label` but when a sample is saved it gets only it's "short_label" set. This is quite irritating.
            label: sample.preferred_label || sample.short_label,
            acts_as: acts_as,
          }
        end

        def solvent_options_for(reaction_process:)
          reaction = reaction_process.reaction

          solvents = (reaction.solvents + reaction.purification_solvents).uniq

          sample_minimal_options(solvents,
                                 'SOLVENT') + sample_minimal_options(Medium::DiverseSolvent.all,
                                                                     'DIVERSE_SOLVENT')
        end
      end
    end
  end
end
