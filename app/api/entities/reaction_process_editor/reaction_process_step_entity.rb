# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessStepEntity < Grape::Entity
      expose(
        :id, :value, :name, :position, :locked, :reaction_process_id, :reaction_id,
        :label, :final_conditions, :select_options, :automation_control, :automation_mode
      )

      expose :activities, using: 'Entities::ReactionProcessEditor::ReactionProcessActivityEntity'

      expose :reaction_process_vessel, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'

      private

      def value
        object.id
      end

      def select_options
        SelectOptions::ReactionProcessStep.new.select_options_for(reaction_process_step: object)
      end

      def reaction
        object.reaction
      end

      def activities
        object.reaction_process_activities.order('position')
      end

      def reaction_id
        reaction&.id
      end
    end
  end
end
