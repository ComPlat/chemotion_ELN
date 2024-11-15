# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class UpdatePosition
        def self.execute!(activity:, position:)
          ActiveRecord::Base.transaction do
            position ||= activity.siblings.length
            activities = activity.siblings.to_a
            activities.delete(activity)
            activities.insert(position, activity)
            activities.compact.each_with_index { |sibling, idx| sibling.update(position: idx) }
            activities
          end
        end
      end
    end
  end
end
