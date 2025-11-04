# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessStepEntity < Grape::Entity
      expose(
        :id, :name, :position, :locked, :reaction_process_id, :reaction_id,
        :label, :final_conditions, :select_options, :step_automation_status, :automation_status
      )

      expose :activities, using: 'Entities::ReactionProcessEditor::ReactionProcessActivityEntity'

      expose :reaction_process_vessel, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'

      private

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
