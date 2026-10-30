# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class AppendActivity
        def self.execute!(reaction_process_step:, activity_params:, position:)
          ActiveRecord::Base.transaction do
            target_step = if activity_params['activity_name'] == 'TRANSFER'
                            reaction_process_step.reaction_process.reaction_process_steps
                                                 .find(activity_params['workup']['target_step_id'])
                          else
                            reaction_process_step
                          end

            automation_ordinal = reaction_process_step.reaction_process.next_automation_ordinal

            activity = target_step.reaction_process_activities.new(
              activity_name: activity_params['activity_name'],
              automation_ordinal: automation_ordinal,
            )

            ReactionProcessActivities::Update.execute!(activity: activity, activity_params: activity_params)

            if target_step == reaction_process_step
              ReactionProcessActivities::UpdatePosition.execute!(activity: activity, position: position)
            end

            activity
          end
        end
      end
    end
  end
end
