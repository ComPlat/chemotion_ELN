# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class Destroy
        def self.execute!(activity:)
          activities = activity.reaction_process_step.reaction_process_activities.order(:position).to_a
          activities.delete(activity)
          activities.each_with_index { |item, idx| item.update(position: idx) }

          activity.destroy

          activities
        end
      end
    end
  end
end
