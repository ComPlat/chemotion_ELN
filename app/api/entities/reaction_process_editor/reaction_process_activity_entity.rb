# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessActivityEntity < Grape::Entity
      expose(:id, :step_id, :activity_name, :position, :workup, :sample_names)

      expose :sample, using: 'Entities::ReactionProcessEditor::SampleEntity'
      expose :medium, using: 'Entities::ReactionProcessEditor::MediumEntity'

      expose :preconditions

      expose :intermediate_type, :transfer_source_step_name # supportive piggybacks required in TRANSFER only

      private

      def intermediate_type
        return unless object.activity_name == 'TRANSFER'

        ReactionsIntermediateSample.find_by(reaction: object.reaction, sample: object.sample)&.intermediate_type
      end

      def transfer_source_step_name
        ris = ReactionsIntermediateSample.find_by(sample: object.sample, reaction: object.reaction)

        return unless object.activity_name == 'TRANSFER' && ris.reaction_step

        # source_step is stored only as index (1-indexed) in its reaction_step (for human readability in ELN).
        object.reaction_process_step.siblings[ris.reaction_step - 1]&.name
      end

      def sample_names
        # Supportive attribute for easy display in frontend.
        names = Sample.where(id: object.workup['purify_solvent_sample_ids']).map(&:preferred_label)
        names << object.sample.preferred_label if object.sample?
        names << object.medium.preferred_label if object.medium?
        names.join(', ')
      end

      def step_id
        object.reaction_process_step_id
      end

      def preconditions
        reaction_process_step.activity_preconditions[object.position]
      end

      def reaction_process_step
        @reaction_process_step ||= object.reaction_process_step
      end
    end
  end
end
