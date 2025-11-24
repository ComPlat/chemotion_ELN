# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcess < Base
        def select_options_for(reaction_process:)
          {
            samples_preparations: sample_preparation_options(reaction_process),
            vessel_preparations: SelectOptions::Models::Vessels.new.preparations,
            step_name_suggestions: step_name_suggestions(reaction_process),
            materials: SelectOptions::Models::Materials.new.select_options_for(reaction_process: reaction_process),
            equipment: SelectOptions::Models::Equipment.new.all,
            FORMS: forms_options(reaction_process),
            ontologies: SelectOptions::Models::Ontologies.new.all,
          }
        end

        private

        def forms_options(reaction_process)
          {
            ADD: SelectOptions::Forms::Add.new.select_options,
            ANALYSIS: SelectOptions::Forms::Analysis.new.select_options,
            CONDITION: SelectOptions::Forms::Condition.new.select_options,
            EVAPORATION: SelectOptions::Forms::Evaporation.new.select_options,
            MOTION: SelectOptions::Forms::Motion.new.select_options,
            PURIFICATION: SelectOptions::Forms::Purification.new.select_options_for(reaction_process: reaction_process),
            REMOVE: SelectOptions::Forms::Remove.new.select_options,
            SAVE: SelectOptions::Forms::SaveSample.new.select_options,
            TRANSFER: SelectOptions::Forms::Transfer.new.select_options_for(reaction_process: reaction_process),
            WAIT: SelectOptions::Forms::Wait.new.select_options,
            POOLING_GROUP: SelectOptions::Forms::PoolingGroups.new.select_options,
          }
        end

        def sample_preparation_options(reaction_process)
          {
            prepared_samples: samples_info_options(prepared_samples(reaction_process), 'SAMPLE'),
            unprepared_samples: samples_info_options(unprepared_samples(reaction_process), 'SAMPLE'),
            equipment: SelectOptions::Models::Equipment.new.all,
            preparation_types: SelectOptions::Models::Samples.new.preparation_types,
          }
        end

        def preparable_samples(reaction_process)
          reaction = reaction_process.reaction || reaction_process.sample_reaction

          return [reaction_process.sample].compact unless reaction

          (reaction.reactions_starting_material_samples +
          reaction.reactions_reactant_samples +
          reaction.reactions_solvent_samples +
          reaction.reactions_purification_solvent_samples +
          reaction.reactions_product_samples +
          reaction.reactions_intermediate_samples).map(&:sample).uniq
        end

        def prepared_samples(reaction_process)
          reaction_process.samples_preparations.order(:created_at).includes(sample: [:molecule]).map(&:sample)
        end

        def unprepared_samples(reaction_process)
          preparable_samples(reaction_process) - prepared_samples(reaction_process)
        end

        def step_name_suggestions(reaction_process)
          reaction_ids = Reaction.where(creator: reaction_process.creator).ids

          procedure_ids = ::ReactionProcessEditor::ReactionProcess.where(reaction_id: reaction_ids).ids
          process_steps = ::ReactionProcessEditor::ReactionProcessStep.where(reaction_process_id: procedure_ids).all
          process_step_names = process_steps.filter_map(&:name).uniq

          process_step_names.map.with_index { |name, idx| { value: idx, label: name } }
        end
      end
    end
  end
end
