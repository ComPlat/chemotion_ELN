# frozen_string_literal: true

module Clap
  module Exporter
    module Reactions
      class SampleSetupExporter < Clap::Exporter::Base
        def to_clap
          return unless model&.sample

          Clap::SampleSetup.new(
            vessel_template: Vessels::ReactionProcessVesselableExporter.new(model.reaction_process_vessel).to_clap,
            sample: sample,
          )
        end

        private

        def sample
          Clap::Sample.new(label: model&.sample&.external_label)
        end
      end
    end
  end
end
