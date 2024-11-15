# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class AppendActivity
        def self.execute!(reaction_process_step:, activity_params:, position:)
          ActiveRecord::Base.transaction do
            # TODO: assert the target step is in the same reaction?
            target_step = if activity_params['activity_name'] == 'TRANSFER'
                            ::ReactionProcessEditor::ReactionProcessStep
                              .find(activity_params['workup']['transfer_target_step_id'])
                          else
                            reaction_process_step
                          end

            activity = target_step.reaction_process_activities.new(activity_name: activity_params['activity_name'])

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
