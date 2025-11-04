# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Materials < Base
          def select_options_for(reaction_process:)
            # We assemble the material options as required in the Frontend.
            # It's a hodgepodge of samples of different origin merged assigned to certain keys, where the differing
            # materials also have differing attributes to cope with.

            reaction = reaction_process.reaction || reaction_process.sample_reaction

            return [reaction_process.sample] unless reaction

            samples_options_for_reaction(reaction)
          end

          def sample_options_for_user(user:)
            return [] unless user&.samples

            sample_minimal_options(user.samples, 'SAMPLE')
          end

          private

          def samples_options_for_reaction(reaction)
            samples = reaction.starting_materials + reaction.reactants + reaction.products
            solvents = (reaction.solvents + reaction.purification_solvents).uniq
            diverse_solvents = Medium::DiverseSolvent.all

            intermediates = reaction.intermediate_samples
            {
              MOLECULAR_ENTITIES: samples_info_options(samples, 'MOLECULAR_ENTITY'),
              ADDITIVE: samples_info_options(Medium::Additive.all, 'ADDITIVE'),
              DIVERSE_SOLVENT: samples_info_options(diverse_solvents, 'DIVERSE_SOLVENT'),
              INTERMEDIATE: samples_info_options(intermediates, 'SAMPLE'),
              MEDIUM: samples_info_options(Medium::MediumSample.all, 'MEDIUM'),
              SAMPLE: samples_info_options(samples, 'SAMPLE'),
              SOLVENT: samples_info_options(solvents,
                                            'SOLVENT') + samples_info_options(diverse_solvents,
                                                                              'DIVERSE_SOLVENT'),
            }
          end
        end
      end
    end
  end
end
