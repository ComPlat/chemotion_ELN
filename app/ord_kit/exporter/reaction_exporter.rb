# frozen_string_literal: true

module OrdKit
  module Exporter
    class ReactionExporter < Base
      # Our KIT-ORD relevant data is stored in the ReactionProcess <-1:1-> Reaction
      # This is why we use the reaction_process.id (which is a UUID) instead of reaction.id,
      # (which is a sequential Integer which we certainly do not want to publish). cbuggle, 2022-02-11.
      def to_ord
        OrdKit::Reaction.new(
          # TODO: Fill all the nils!
          identifiers: nil,
          inputs: {},
          setup: nil,
          conditions: conditions,
          observations: nil,
          notes: nil,
          workups: nil,
          outcomes: nil,
          provenance: OrdKit::Exporter::Reactions::ReactionProvenanceExporter.new(
            model.reaction_process.provenance,
          ).to_ord,
          reaction_id: model.reaction_process.id,
          reaction_steps: OrdKit::Exporter::Reactions::ReactionProcessExporter.new(model.reaction_process).to_ord,
        )
      end

      private

      def conditions
        OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(model.reaction_process.initial_conditions).to_ord
      end
    end
  end
end
