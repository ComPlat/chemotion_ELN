# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessActivityEntity < Grape::Entity
      expose(:id, :step_id, :activity_name, :position, :workup)

      expose :sample, using: 'Entities::ReactionProcessEditor::SampleEntity'
      expose :medium, using: 'Entities::ReactionProcessEditor::MediumEntity'

      expose :preconditions

      expose :transfer_source_step_name # supportive piggyback required in TRANSFER only

      expose :reaction_process_vessel, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'

      private

      def transfer_source_step_name
        return unless object.transfer?

        ReactionsIntermediateSample
          .find_by(reaction: object.reaction, sample: object.sample)
          &.reaction_process_step
          &.name
      end

      def preconditions
        object.reaction_process_step.activity_preconditions[object.position]
      end

      def step_id
        object.reaction_process_step_id
      end
    end
  end
end
