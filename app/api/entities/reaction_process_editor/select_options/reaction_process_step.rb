# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcessStep < Base
        def self.all(reaction_process_step)
          {
            added_materials: added_materials(reaction_process_step),
            removable_materials: removable_materials(reaction_process_step),
            mounted_equipment: mounted_equipment(reaction_process_step),
            transferable_samples: transferable_samples(reaction_process_step),
            transfer_targets: transfer_targets(reaction_process_step),
            save_sample_origins: save_sample_origins(reaction_process_step),
          }
        end

        def self.added_materials(reaction_process_step)
          add_activity_names = ['ADD']
          # For the ProcessStepHeader in the UI, in order of actions.
          reaction_process_step.reaction_process_activities.order(:position).filter_map do |action|
            if add_activity_names.include?(action.activity_name)
              added_material_option = sample_info_option(action.sample || action.medium, action.workup['acts_as'])
              added_material_option.merge(amount: action.workup['target_amount'])
            end
          end.uniq
        end

        def self.removable_materials(reaction_process_step)
          # For UI selects to REMOVE only previously added materials, scoped to acts_as.
          {
            SOLVENT: added_samples_acting_as(reaction_process_step, 'SOLVENT'),
            MEDIUM: added_samples_acting_as(reaction_process_step, 'MEDIUM'),
            ADDITIVE: added_samples_acting_as(reaction_process_step, 'ADDITIVE'),
            DIVERSE_SOLVENT: added_samples_acting_as(reaction_process_step, 'DIVERSE_SOLVENT'),
          }
        end

        def self.added_samples_acting_as(reaction_process_step, acts_as)
          reaction_process_step.added_materials(acts_as).map do |sample|
            sample_info_option(sample, acts_as)
          end
        end

        def self.mounted_equipment(reaction_process_step)
          titlecase_options_for(reaction_process_step.mounted_equipment)
        end

        def self.transferable_samples(reaction_process_step)
          Sample.where(id: transferable_sample_ids(reaction_process_step))
                .includes(%i[molecule molecule_name residues])
                .map do |sample|
            sample_info_option(sample, 'SAMPLE')
          end
        end

        def self.transfer_targets(reaction_process_step)
          reaction_process_step.siblings.map do |process_step|
            { value: process_step.id,
              label: process_step.label,
              saved_sample_ids: process_step.saved_sample_ids }
          end
        end

        def self.transferable_sample_ids(reaction_process_step)
          reaction_process_step.reaction_process.saved_sample_ids
        end

        def self.save_sample_origins(reaction_process_step)
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

        def self.option_for_purify_step(purify_step, purification, position)
          solvents = purify_step['solvents'] || []

          solvent_labels = solvents&.pluck('label')&.join(', ')

          purify_step.merge({
                              value: "#{purification.id}-purify-step-#{position + 1}}",
                              label: "#{purification.position + 1}.#{position + 1} #{solvent_labels}",
                            })
        end
      end
    end
  end
end
