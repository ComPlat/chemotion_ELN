# frozen_string_literal: true

module OrdKit
  module Exporter
    class ReactionProcessExporter < Base
      CURRENT_ORD_VERSION = '1.0.0'

      def to_ord
        ::OrdKit::Reaction.new(
          ord_version: CURRENT_ORD_VERSION,
          reaction_id: reaction_id,
          provenance: provenance,
          conditions: conditions,
          reaction_steps: reaction_steps,
          sample_setup: sample_setup,
        )
      end

      private

      def reaction_id
        # Our KIT-ORD relevant data is stored in the ReactionProcess <-1:1-> Reaction
        # So to identify the reaction we actually use the reaction_process.id (which is a UUID)
        # (instead of reaction.id which is a sequential Integer which we do not want to publish).
        # cbuggle, 2022-02-11.
        model.id
      end

      def provenance
        OrdKit::Exporter::Reactions::ReactionProvenanceExporter.new(model.provenance).to_ord
      end

      def conditions
        OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(model.initial_conditions).to_ord
      end

      def reaction_steps
        process_steps = model.reaction_process_steps.order(:position).includes([:reaction_process_vessel])
        start_times = process_steps.inject([0]) { |starts, rps| starts << (starts.last + rps.duration.to_i) }

        process_steps.map.with_index do |rps, idx|
          ReactionProcessStepExporter.new(rps).to_ord(starts_at: start_times[idx])
        end
      end

      def sample_setup
        OrdKit::Exporter::Reactions::SampleSetupExporter.new(model).to_ord
      end
    end
  end
end
