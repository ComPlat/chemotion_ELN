# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcess < Base
        def self.all(reaction_process)
          {
            samples_preparations: sample_preparation_options(reaction_process),
            vessel_preparations: SelectOptions::Vessels.preparations,
            step_name_suggestions: step_name_suggestions(reaction_process),
            activity_type_equipment: SelectOptions::Equipment.per_activity_type,
            purify: {
              crystallization: { modes: SelectOptions::Custom.crystallization_modes },
              extraction: { phases: SelectOptions::Custom.extraction_phases },
              filtration: { modes: SelectOptions::Custom.filtration_modes },
              chromatography: SelectOptions::Chromatography.select_options,
            },
            condition_additional_information: SelectOptions::Conditions.additional_information,
            addition_speed_types: SelectOptions::Custom.addition_speed_types,
            materials: SelectOptions::Materials.all_for(reaction_process),
            equipment: SelectOptions::Equipment.all,
            automation_modes: SelectOptions::Custom.automation_modes,
            motion_types: SelectOptions::Custom.motion_types,
            remove_sample_types: SelectOptions::Samples.remove_sample_types,
            save_sample_types: SelectOptions::Samples.save_sample_types,
            analysis_types: SelectOptions::Custom.analysis_types,
          }
        end

        def self.sample_preparation_options(reaction_process)
          {
            prepared_samples: samples_options(prepared_samples(reaction_process), 'SAMPLE'),
            unprepared_samples: samples_options(unprepared_samples(reaction_process), 'SAMPLE'),
            equipment: SelectOptions::Equipment.all,
            preparation_types: SelectOptions::Samples.preparation_types,
          }
        end

        def self.preparable_samples(reaction_process)
          reaction = reaction_process.reaction

          (reaction.reactions_starting_material_samples +
          reaction.reactions_reactant_samples +
          reaction.reactions_solvent_samples +
          reaction.reactions_purification_solvent_samples +
          reaction.reactions_product_samples +
          reaction.reactions_intermediate_samples).map(&:sample).uniq
        end

        def self.prepared_samples(reaction_process)
          reaction_process.samples_preparations.order(:created_at).includes(sample: [:molecule]).map(&:sample)
        end

        def self.unprepared_samples(reaction_process)
          preparable_samples(reaction_process) - prepared_samples(reaction_process)
        end

        def self.step_name_suggestions(reaction_process)
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
