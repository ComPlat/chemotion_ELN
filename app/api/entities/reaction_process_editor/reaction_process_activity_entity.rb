# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessActivityEntity < Grape::Entity
      expose(:id, :step_id, :activity_name, :position, :workup, :automation_response)

      expose :reaction_process_vessel, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'
      expose :sample, using: 'Entities::ReactionProcessEditor::SampleEntity'
      expose :medium, using: 'Entities::ReactionProcessEditor::MediumEntity'
      expose :fractions, using: 'Entities::ReactionProcessEditor::FractionEntity'
      expose :consumed_fraction, using: 'Entities::ReactionProcessEditor::FractionEntity'
      expose :preconditions

      expose :transfer_source_step_name # supportive piggyback required in TRANSFER only
      expose :transfer_target_step_name # supportive piggyback required in TRANSFER only

      private

      def fractions
        object.fractions.order(:position)
      end

      def transfer_source_step_name
        return unless object.transfer?

        ::ReactionProcessEditor::ReactionProcessStep.find_by(id: object.workup['source_step_id'])&.name

        # ReactionsIntermediateSample
        #   .find_by(reaction: object.reaction, sample: object.sample)
        #   &.reaction_process_step
        #   &.name
      end

      def transfer_target_step_name
        return unless object.transfer?

        object.reaction_process_step&.name
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
