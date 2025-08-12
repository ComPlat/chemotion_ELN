# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class AnalysisActionExporter < OrdKit::Exporter::Actions::Base
        ANALYSIS_EXPORTER = {
          CHROMATOGRAPHY: OrdKit::Exporter::Actions::Analysis::ChromatographyExporter,
          SPECTROSCOPY: OrdKit::Exporter::Actions::Analysis::SpectroscopyExporter,
          SPECTROMETRY: OrdKit::Exporter::Actions::Analysis::SpectrometryExporter,
        }.stringify_keys

        private

        def action_type_attributes
          { analysis: ANALYSIS_EXPORTER[workup['analysis_type']]&.new(action)&.to_ord || {} }
        end
      end
    end
  end
end
