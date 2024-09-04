# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcessStep < Base
        def all(reaction_process_step)
          {
            added_materials: added_materials(reaction_process_step),
            removable_samples: removable_samples(reaction_process_step),
            mounted_equipment: mounted_equipment(reaction_process_step),
            transferable_samples: transferable_samples(reaction_process_step),
            transfer_targets: transfer_targets(reaction_process_step),
            save_sample_origins: save_sample_origins(reaction_process_step),
          }
        end

        # def added_materials(material_type)
        #   material_ids = reaction_process.reaction_process_steps.where(position: ..position).map do |process_step|
        #     process_step.added_material_ids(material_type)
        #   end.flatten.uniq
        # end

        # def added_material_ids(material_type)
        #   activities_adding_sample_acting_as(material_type).map { |activity| activity.workup['sample_id'] }
        # end

        # def activities_adding_sample_acting_as(material_type)
        #   activities_adding_sample.select { |activity| activity.workup['acts_as'] == material_type }
        # end

        # def activities_adding_sample
        #   @activities_adding_sample ||= reaction_process_activities.select do |activity|
        #     activity.activity_name == 'ADD'
        #   end
        # end

        def added_materials(reaction_process_step)
          add_activity_names = ['ADD']
          # For the ProcessStepHeader in the UI, in order of actions.
          reaction_process_step.reaction_process_activities.order(:position).filter_map do |action|
            if add_activity_names.include?(action.activity_name)
              added_material_option = sample_info_option(action.sample || action.medium,
                                                         action.workup['acts_as'])
              added_material_option.merge(amount: action.workup['target_amount'])
            end
          end.uniq
        end

        # TODO: Rewrite scoped to Remove origin type
        def removable_samples(reaction_process_step)
          {
            FROM_REACTION: all_reaction_samples_options(reaction_process_step),
            FROM_REACTION_STEP: current_step_samples_options(reaction_process_step),
            FROM_SAMPLE: saved_sample_with_solvents_options(reaction_process_step),
            DIVERSE_SOLVENTS: [],
            STEPWISE: [],
            FROM_METHOD: [],
          }
        end

        def mounted_equipment(reaction_process_step)
          titlecase_options_for(reaction_process_step.mounted_equipment)
        end

        def transferable_samples(reaction_process_step)
          Sample.where(id: transferable_sample_ids(reaction_process_step))
                .includes(%i[molecule molecule_name residues])
                .map do |sample|
            sample_info_option(sample, 'SAMPLE')
          end
        end

        def transfer_targets(reaction_process_step)
          reaction_process_step.siblings.map do |process_step|
            { value: process_step.id,
              label: process_step.label,
              saved_sample_ids: process_step.saved_sample_ids }
          end
        end

        def transferable_sample_ids(reaction_process_step)
          reaction_process_step.reaction_process.saved_sample_ids
        end

        def save_sample_origins(reaction_process_step)
          reaction_process_step
            .reaction_process_activities
            .where(activity_name: 'PURIFY')
            .order(:position)
            .map do |purification|
            purify_step_options = purification.workup && purification.workup['purify_steps']

            { value: purification.id,
              label: "#{purification.position + 1} #{purification.workup['purify_type'].titlecase}",
              purify_type: purification.workup['purify_type'],
              purify_steps: purify_step_options&.map&.with_index do |purify_step, index|
                              option_for_purify_step(purify_step, purification, index)
                            end }
          end
        end

        private

        def current_step_samples_options(reaction_process_step)
          %w[SOLVENT MEDIUM ADDITIVE DIVERSE_SOLVENT].map do |material|
            added_samples_acting_as(reaction_process_step, material)
          end.flatten.uniq
        end

        def all_reaction_samples_options(reaction_process_step)
          reaction_process_step.siblings.order(:position).map do |current_step|
            current_step_samples_options(current_step)
          end.flatten.uniq
        end

        def saved_sample_with_solvents_options(reaction_process_step)
          save_actions = reaction_process_step.reaction_process_activities.order(:position).select do |activity|
            activity.activity_name == 'SAVE'
          end

          save_actions.map do |action|
            saved_sample_with_solvents_option(action)
          end
        end

        def saved_sample_with_solvents_option(action)
          return {} unless action.sample?

          solvents = action.workup.dig('sample_origin_purify_step', 'solvents') || []

          sample_minimal_option(action.sample, 'SAMPLE').merge(
            {
              amount: { value: action.sample.target_amount_value, unit: action.sample.target_amount_unit },
              solvents: solvents,
              solvents_amount: action.workup['solvents_amount'],
            },
          )
        end

        def added_samples_acting_as(reaction_process_step, acts_as)
          reaction_process_step.added_materials(acts_as).map do |sample|
            sample_minimal_option(sample, acts_as)
          end
        end

        def option_for_purify_step(purify_step, purification, position)
          solvents = purify_step['solvents'] || []

          solvent_labels = solvents.pluck('label')&.join(', ')

          purify_step.merge({
                              value: "#{purification.id}-purify-step-#{position + 1}}",
                              label: "#{purification.position + 1}.#{position + 1} #{solvent_labels}",
                              position: position + 1,
                            })
        end
      end
    end
  end
end
