# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class ReactionProcessStep < Base
        def select_options_for(reaction_process_step:)
          {
            added_materials: added_materials(reaction_process_step),
            mounted_equipment: mounted_equipment(reaction_process_step),
            saved_samples: saved_samples(reaction_process_step),
            FORMS: {
              REMOVE: { removable_samples: removable_samples(reaction_process_step) },
              SAVE: { origins: save_sample_origins(reaction_process_step) },
              TRANSFER: {
                transferable_samples: saved_samples(reaction_process_step),
                targets: transfer_targets(reaction_process_step),
              },
            },
          }
        end

        def added_materials(reaction_process_step)
          # For the ProcessStepHeader in the UI, in order of actions.
          reaction_process_step.reaction_process_activities.order(:position).filter_map do |action|
            if action.adds_compound?
              added_material_option = sample_info_option(action.compound, action.workup['acts_as'])
              added_material_option.merge(amount: action.workup['target_amount'])
            end
          end.uniq
        end

        def removable_samples(reaction_process_step)
          {
            FROM_REACTION: all_reaction_samples_options(reaction_process_step),
            FROM_REACTION_STEP: current_step_samples_options(reaction_process_step),
            FROM_SAMPLE: saved_sample_with_solvents_options(reaction_process_step),
            DIVERSE_SOLVENTS: [],
            STEPWISE: [],
            FROM_METHOD: [],
            SOLVENT_FROM_FRACTION: step_fractions_options(reaction_process_step),
          }
        end

        def mounted_equipment(reaction_process_step)
          titlecase_options_for(reaction_process_step.mounted_equipment)
        end

        def saved_samples(reaction_process_step)
          Sample.where(id: reaction_process_step.reaction_process.saved_sample_ids)
                .includes(%i[molecule residues])
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

        def step_fractions_options(reaction_process_step)
          reaction_process_step
            .reaction_process_activities
            .order(:position)
            .map do |parent_activity|
              parent_activity.fractions.map do |fraction|
                label = "(#{parent_activity.position + 1}) Fraction ##{fraction.position}"

                { value: fraction.id, id: fraction.id, label: label, acts_as: 'FRACTION' }
              end
            end.flatten
               .compact
        end

        def save_sample_origins(reaction_process_step)
          reaction_process_step
            .reaction_process_activities
            .includes([:reaction_process_vessel])
            .where(activity_name: 'PURIFICATION')
            .order(:position)
            .map do |purification|
            purification_step_options = purification.workup && purification.workup['purification_steps']

            { value: purification.id,
              label: "#{purification.position + 1} #{purification.workup['purification_type']&.titlecase}",
              purification_type: purification.workup['purification_type'],
              purification_steps: purification_step_options&.map&.with_index do |purification_step, index|
                option_for_purification_step(purification_step, purification, index)
              end }
          end
        end

        private

        def current_step_samples_options(reaction_process_step)
          %w[SOLVENT MEDIUM ADDITIVE DIVERSE_SOLVENT MODIFIER].map do |material|
            added_samples_acting_as(reaction_process_step, material)
          end.flatten.uniq
        end

        def all_reaction_samples_options(reaction_process_step)
          reaction_process_step.siblings.order(:position).map do |current_step|
            current_step_samples_options(current_step)
          end.flatten.uniq
        end

        def saved_sample_with_solvents_options(reaction_process_step)
          reaction_process_step.reaction_process_activities
                               .includes([:reaction_process_vessel])
                               .order(:position)
                               .select(&:saves_sample?)
                               .map do |action|
            saved_sample_with_solvents_option(action)
          end
        end

        def saved_sample_with_solvents_option(action)
          return {} unless action.sample

          solvents = action.workup.dig('sample_origin_purification_step', 'solvents') || []

          sample_minimal_option(action.sample, 'SAMPLE').merge(
            {
              amount: ::ReactionProcessEditor::SampleAmountsConverter.to_rpe(action.sample),
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

        def option_for_purification_step(purification_step, purification, position)
          solvents = purification_step['solvents'] || []

          solvent_labels = solvents.pluck('label')&.join(', ')

          purification_step.merge({
                                    value: "#{purification.id}-purification-step-#{position + 1}}",
                                    label: "#{purification.position + 1}.#{position + 1} #{solvent_labels}",
                                    position: position + 1,
                                  })
        end
      end
    end
  end
end
