# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessEntity < Grape::Entity
      SELECT_OPTIONS = SelectOptions::Custom

      expose :id, :short_label

      expose :reaction_process_steps, using: 'Entities::ReactionProcessEditor::ReactionProcessStepEntity'
      expose :samples_preparations, using: 'Entities::ReactionProcessEditor::SamplePreparationEntity'
      expose :reaction_process_vessels, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'
      expose :provenance, using: 'Entities::ReactionProcessEditor::ProvenanceEntity'

      expose :reaction_svg_file
      expose :reaction_default_conditions, :user_default_conditions

      expose :select_options

      private

      delegate :reaction, to: :object

      def reaction_process_steps
        @reaction_process_steps ||= object.reaction_process_steps.order('position')
      end

      def samples_preparations
        object.samples_preparations.includes([:sample]).order('created_at')
      end

      def provenance
        object.provenance || ::ReactionProcessEditor::Provenance.new(reaction_process: object,
                                                                     email: object.creator.email,
                                                                     username: object.creator.name)
      end

      def reaction_default_conditions
        #  Piggyback reaction_process_id for convenience in UI Navbar which is outside the reaction_process scope.
        object.reaction_default_conditions.merge({ reaction_process_id: object.id })
      end

      def user_default_conditions
        SelectOptions::Conditions::GLOBAL_DEFAULTS
          .merge(object.user_default_conditions)
      end

      def select_options
        SelectOptions::ReactionProcess.instance.all(object)
      end
    end
  end
end
