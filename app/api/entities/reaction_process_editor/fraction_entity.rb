# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class FractionEntity < Grape::Entity
      expose(
        :id, :position, :vials, :consuming_action_id
      )

      expose :consuming_action_name

      private

      def consuming_action_name
        consuming_action = object.consuming_action
        activity_name = consuming_action&.activity_name

        activity_name || 'DEFINE_FRACTION'
      end
    end
  end
end
