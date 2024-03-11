# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class ReactionSetupExporter < OrdKit::Exporter::Base
        # TODO: This is sort of an error when ProcedureStep has no vessel set.
        def to_ord
          return unless model

          OrdKit::ReactionSetup.new(
            vessel: Vessels::ReactionProcessVesselExporter.new(model.reaction_process_vessel).to_ord,
            is_automated: false, # NYI in ELN/RPE.
            automation_platform: '', # Unknown in ELN.
            automation_code: {}, # Unknown in ELN.
            environment: ReactionEnvironmentExporter.new(model).to_ord,
          )
        end
      end
    end
  end
end
