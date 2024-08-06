# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class SolventsWithRatioExporter
        def initialize(solvents_workup)
          @solvents_workup = solvents_workup
        end

        def to_ord
          Array(@solvents_workup).map do |solvent_workup|
            OrdKit::CompoundWithRatio.new(
              compound: OrdKit::Exporter::Samples::SampleExporter.new(solvent_workup).to_ord,
              ratio: solvent_workup['ratio'].to_s,
            )
          end
        end
      end
    end
  end
end
