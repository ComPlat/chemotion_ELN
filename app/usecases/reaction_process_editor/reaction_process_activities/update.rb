# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class Update
        def self.execute!(activity:, activity_params:)
          ActiveRecord::Base.transaction do
            activity.workup = activity_params['workup']

            activity.reaction_process_vessel =
              Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate
              .execute!(reaction_process_id: activity.reaction_process.id,
                        reaction_process_vessel_params: activity_params['reaction_process_vessel'])

            SaveIntermediate.execute!(activity: activity, workup: activity_params['workup']) if activity.saves_sample?

            activity.save

            ReactionProcessVessels::SweepUnused.execute!(reaction_process_id: activity.reaction_process.id)
            activity
          end
        end
      end
    end
  end
end
