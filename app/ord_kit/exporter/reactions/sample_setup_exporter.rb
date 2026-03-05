# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class SampleSetupExporter < OrdKit::Exporter::Base
        def to_ord
          return unless model&.sample

          OrdKit::SampleSetup.new(
            vessel_template: Vessels::ReactionProcessVesselableExporter.new(model.reaction_process_vessel).to_ord,
            sample: sample,
          )
        end

        private

        def sample
          OrdKit::Sample.new(label: model&.sample&.external_label)
        end
      end
    end
  end
end
