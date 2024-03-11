# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class Update
        def self.execute!(activity:, activity_params:)
          ActiveRecord::Base.transaction do
            activity.update(workup: activity_params['workup'])

            if activity.activity_name == 'SAVE'
              SaveIntermediate.execute!(activity: activity,
                                        workup: activity_params['workup'])
            end

            activity.update(reaction_process_vessel: ReactionProcessVessels::CreateOrUpdate.execute!(
              reaction_process_id: activity.reaction_process.id,
              reaction_process_vessel_params: activity_params['reaction_process_vessel'],
            ))
            ReactionProcessVessels::SweepUnused.execute!(reaction_process_id: activity.reaction_process.id)

            activity
          end
        end
      end
    end
  end
end
