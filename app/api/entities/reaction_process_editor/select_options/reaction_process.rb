# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcess < Base
        def all(reaction_process)
          {
            samples_preparations: sample_preparation_options(reaction_process),
            vessel_preparations: SelectOptions::Vessels.instance.preparations,
            step_name_suggestions: step_name_suggestions(reaction_process),
            activity_type_equipment: SelectOptions::Equipment.instance.per_activity_type,
            purify: SelectOptions::Purify.instance.select_options(reaction_process),
            condition_additional_information: SelectOptions::Conditions.instance.additional_information,
            addition_speed_types: SelectOptions::Custom.instance.addition_speed_types,
            materials: SelectOptions::Materials.instance.all_for(reaction_process),
            equipment: SelectOptions::Equipment.instance.all,
            automation_modes: SelectOptions::Custom.instance.automation_modes,
            motion_types: SelectOptions::Custom.instance.motion_types,
            remove_sample_types: SelectOptions::Samples.instance.remove_sample_types,
            remove_origin_types: SelectOptions::Remove.instance.origin_types,
            save_sample_types: SelectOptions::Samples.instance.save_sample_types,
            save_sample_origin_types: SelectOptions::Samples.instance.save_sample_origin_types,
            analysis_types: SelectOptions::Custom.instance.analysis_types,
          }
        end

        def sample_preparation_options(reaction_process)
          {
            prepared_samples: samples_info_options(prepared_samples(reaction_process), 'SAMPLE'),
            unprepared_samples: samples_info_options(unprepared_samples(reaction_process), 'SAMPLE'),
            equipment: SelectOptions::Equipment.instance.all,
            preparation_types: SelectOptions::Samples.instance.preparation_types,
          }
        end

        def preparable_samples(reaction_process)
          reaction = reaction_process.reaction

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
