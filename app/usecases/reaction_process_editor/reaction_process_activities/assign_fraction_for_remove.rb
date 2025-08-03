# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class AssignFractionForRemove
        def self.execute!(activity:)
          return unless activity.activity_name == 'REMOVE' && activity.workup['origin_type'] == 'SOLVENT_FROM_FRACTION'

          fraction_id = activity.workup['samples'][0]['id']
          fraction = ::ReactionProcessEditor::Fraction.find_by(id: fraction_id)

          fraction&.update(consuming_activity: activity)
          fraction
        end
      end
    end
  end
end
