# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class SampleSetupExporter < OrdKit::Exporter::Base
        def to_ord
          return unless model&.sample

          OrdKit::SampleSetup.new(
            vessel_template: Vessels::ReactionProcessVesselableExporter.new(model.reaction_process_vessel).to_ord,
            sample: Samples::SampleExporter.new(model.sample).to_ord,
          )
        end
      end
    end
  end
end
