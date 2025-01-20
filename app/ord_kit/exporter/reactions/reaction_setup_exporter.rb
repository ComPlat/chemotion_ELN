# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class ReactionSetupExporter < OrdKit::Exporter::Base
        # TODO: It is sort of a semantical error when ProcedureStep has no vessel set. We do not cope yet.
        def to_ord
          return unless model

          OrdKit::ReactionSetup.new(
            vessel: Vessels::ReactionProcessVesselExporter.new(model.reaction_process_vessel).to_ord,
          )
        end
      end
    end
  end
end
