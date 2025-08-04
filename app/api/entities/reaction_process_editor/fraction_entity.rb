# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class FractionEntity < Grape::Entity
      expose(
        :id, :position, :vials, :consuming_activity_id
      )

      expose :consuming_activity_name

      private

      def consuming_activity_name
        consuming_activity = object.consuming_activity
        activity_name = consuming_activity&.activity_name

        return 'DEFINE_FRACTION' unless consuming_activity

        if activity_name == 'ANALYSIS'
          "#{activity_name}_#{consuming_activity.workup['analysis_type']}"
        elsif activity_name == 'PURIFICATION'
          consuming_activity.workup['purification_type']
        else
          activity_name
        end
      end
    end
  end
end
