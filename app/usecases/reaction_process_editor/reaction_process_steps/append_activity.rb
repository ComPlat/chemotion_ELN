# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class AppendActivity
        def self.execute!(reaction_process_step:, activity_params:, position:)
          ActiveRecord::Base.transaction do
            if activity_params['activity_name'] == 'TRANSFER'
              initiating_step = reaction_process_step
              reaction_process_step = ::ReactionProcessEditor::ReactionProcessStep.find(
                activity_params['workup']['transfer_target_step_id'],
              ) # TODO: assert the step is in the same reaction?

              position = nil unless reaction_process_step == initiating_step
            end

            activity = reaction_process_step.reaction_process_activities.new(
              activity_name: activity_params['activity_name'],
              position: reaction_process_step.reaction_process_activities.count,
            )

            ReactionProcessActivities::Update.execute!(activity: activity, activity_params: activity_params)
            ReactionProcessActivities::UpdatePosition.execute!(activity: activity, position: position) if position

            activity
          end
        end
      end
    end
  end
end
