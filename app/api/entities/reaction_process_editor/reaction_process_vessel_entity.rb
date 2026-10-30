# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessVesselEntity < Grape::Entity
      expose(:id, :vesselable_id, :vesselable_type, :preparations, :cleanup)

      expose :step_names

      expose :vesselable, using: 'Entities::ReactionProcessEditor::VesselableEntity'

      private

      def preparations
        object.preparations || []
      end

      def step_names
        object.reaction_process.reaction_process_steps
              .where(reaction_process_vessel_id: object.id)
              .order(:position)
              .map(&:name)
      end
    end
  end
end
