# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Materials < Base
        def self.all_for(reaction_process)
          # We assemble the material options as required in the Frontend.
          # It's a hodgepodge of samples of different origin merged assigned to certain keys, where the differing
          # materials also have differing attributes to cope with.

          reaction = reaction_process.reaction

          samples = reaction.starting_materials + reaction.reactants
          solvents = (reaction.solvents + reaction.purification_solvents).uniq
          diverse_solvents = Medium::DiverseSolvent.all

          intermediates = reaction.intermediate_samples
          {
            ADDITIVE: samples_info_options(Medium::Additive.all, 'ADDITIVE'),
            DIVERSE_SOLVENT: samples_info_options(diverse_solvents, 'DIVERSE_SOLVENT'),
            INTERMEDIATE: samples_info_options(intermediates, 'SAMPLE'),
            MEDIUM: samples_info_options(Medium::MediumSample.all, 'MEDIUM'),
            SAMPLE: samples_info_options(samples, 'SAMPLE'),
            SOLVENT: samples_info_options(solvents,
                                          'SOLVENT') + samples_info_options(diverse_solvents, 'DIVERSE_SOLVENT'),
          }
        end
      end
    end
  end
end
