# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class UpdateWorkup
        def self.execute!(activity:, workup:)
          ActiveRecord::Base.transaction do
            activity.update(workup: workup)
            SaveIntermediate.execute!(activity: activity, workup: workup) if activity.activity_name == 'SAVE'
            activity
          end
        end
      end
    end
  end
end
