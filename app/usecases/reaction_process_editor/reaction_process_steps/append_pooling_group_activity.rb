# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class AppendPoolingGroupActivity
        ONTOLOGY_IDS = {
          CHROMATOGRAPHY: { class: 'CHMO:0001000', action: 'CHMO:0002231', automated: 'NCIT:C70669' },
          ANALYSIS_CHROMATOGRAPHY: { class: 'CHMO:0001000', action: 'OBI:0000070', automated: 'NCIT:C70669' },
          ANALYSIS_SPECTROSCOPY: { class: 'CHMO:0000228', action: 'OBI:0000070', automated: 'NCIT:C70669' },
        }.deep_stringify_keys.freeze

        def self.execute!(reaction_process_step:, pooling_group_params:, position:)
          ActiveRecord::Base.transaction do
            vessel = Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate.execute!(
              reaction_process_id: reaction_process_step.reaction_process_id,
              reaction_process_vessel_params: pooling_group_params['vessel'],
            )

            activity_setup = activity_setup_for_action_name(pooling_group_params['followup_action'])

            activity = reaction_process_step.reaction_process_activities
                                            .new(activity_name: activity_setup[:activity_name])

            activity.reaction_process_vessel = vessel

            activity.workup = { vials: pooling_group_params['vials']&.pluck('id') || [] }
                              .merge(activity_setup[:workup])
                              .deep_stringify_keys

            ReactionProcessActivities::UpdatePosition.execute!(activity: activity, position: position)

            activity
          end
        end

        def self.activity_setup_for_action_name(follow_up_action)
          activity_name = follow_up_action['value']

          ontology = ONTOLOGY_IDS[activity_name]

          if %w[CHROMATOGRAPHY FILTRATION EXTRACTION CRYSTALLIZATION].include?(activity_name)
            { activity_name: 'PURIFICATION',
              workup: { purification_type: activity_name,
                        action: ontology&.action,
                        class: ontology&.class,
                        automated: ontology&.automated } }
          elsif %w[ANALYSIS_CHROMATOGRAPHY ANALYSIS_SPECTROSCOPY].include?(activity_name)
            { activity_name: 'ANALYSIS',
              workup: {
                analysis_type: activity_name.delete_prefix('ANALYSIS_'),
                action: ontology&.action,
                class: ontology&.class,
                automated: ontology&.automated,

              } }
          else
            { activity_name: activity_name, workup: {} }
          end
        end
      end
    end
  end
end
