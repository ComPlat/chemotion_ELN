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

        activity_name || 'DEFINE_FRACTION'
      end
    end
  end
end
