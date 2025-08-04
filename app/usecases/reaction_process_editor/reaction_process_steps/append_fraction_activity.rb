# marker comment
# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class AppendFractionActivity
        ONTOLOGY_IDS = {
          CHROMATOGRAPHY: { class: 'CHMO:0001000', action: 'CHMO:0002231', automated: 'NCIT:C70669' },
          ANALYSIS_CHROMATOGRAPHY: { class: 'CHMO:0001000', action: 'OBI:0000070', automated: 'NCIT:C70669' },
          ANALYSIS_SPECTROSCOPY: { class: 'CHMO:0000228', action: 'OBI:0000070', automated: 'NCIT:C70669' },
        }.deep_stringify_keys.freeze

        # rubocop:disable  Metrics/BlockLength
        def self.execute!(parent_activity:, index:, fraction_params:)
          ActiveRecord::Base.transaction do
            consuming_activity = build_consuming_activity_for_activity_name(
              reaction_process_step: parent_activity.reaction_process_step,
              activity_name: fraction_params['consuming_activity_name'],
            )

            fraction = ::ReactionProcessEditor::Fraction.create(
              position: fraction_params['position'],
              parent_activity: parent_activity,
              consuming_activity: consuming_activity,
              vials: fraction_params['vials'] || [],
            )

            if consuming_activity
              consuming_activity.reaction_process_vessel =
                Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate.execute!(
                  reaction_process_id: parent_activity.reaction_process.id,
                  reaction_process_vessel_params: fraction_params['vessel'],
                )

              if consuming_activity.saves_sample?
                ReactionProcessActivities::SaveIntermediate.execute!(activity: consuming_activity, workup: {})
              end

              if consuming_activity.remove?
                consuming_activity = assign_remove_workup(fraction: fraction, consuming_activity: consuming_activity)
              end

              ReactionProcessActivities::UpdatePosition.execute!(activity: consuming_activity,
                                                                 position: parent_activity.position + index + 1)
            end
            consuming_activity
          end
        end
        # rubocop:enable  Metrics/BlockLength

        def self.activity_setup_for_action_name(activity_name)
          ontology = ONTOLOGY_IDS[activity_name] || {}

          # TODO: Enhance with all applicable   settings, eg. automation_mode, filtration_mode
          # "automation_mode"=>"AUTOMATED", "filtration_mode"=>"KEEP_PRECIPITATE"

          # TODO: Create Sample for ADD, allow ADD.

          if %w[CHROMATOGRAPHY FILTRATION EXTRACTION CRYSTALLIZATION].include?(activity_name)
            { activity_name: 'PURIFICATION',
              workup: { purification_type: activity_name,
                        action: ontology['action'],
                        class: ontology['class'],
                        automated: ontology['automated'] } }
          elsif %w[ANALYSIS_CHROMATOGRAPHY ANALYSIS_SPECTROSCOPY].include?(activity_name)
            { activity_name: 'ANALYSIS',
              workup: {
                analysis_type: activity_name.delete_prefix('ANALYSIS_'),
                action: ontology['action'],
                class: ontology['class'],
              } }
          else
            { activity_name: activity_name, workup: {} }
          end
        end

        def self.assign_remove_workup(fraction:, consuming_activity:)
          label = "(#{(fraction.parent_activity&.position || 0) + 1}) Fraction ##{fraction&.position}"
          consuming_activity.workup['samples'] = [{ id: fraction.id, value: fraction.id, label: label }]
          consuming_activity.workup['origin_type'] = 'SOLVENT_FROM_FRACTION'
          consuming_activity.workup['automation_mode'] = 'AUTOMATED'
          consuming_activity
        end

        def self.build_consuming_activity_for_activity_name(reaction_process_step:, activity_name:)
          return if activity_name == 'DEFINE_FRACTION'

          activity_setup = activity_setup_for_action_name(activity_name)

          consuming_activity = reaction_process_step.reaction_process_activities
                                                    .new(activity_name: activity_setup[:activity_name])

          consuming_activity.workup = activity_setup[:workup].deep_stringify_keys
          consuming_activity
        end
      end
    end
  end
end
