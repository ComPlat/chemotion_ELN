# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class AnalysisActionExporter < OrdKit::Exporter::Actions::Base
        # Measurment data is congruent to Purification data, we can reuse the exporters.
        ANALYSIS_EXPORTER = {
          CHROMATOGRAPHY: OrdKit::Exporter::Actions::Analysis::ChromatographyExporter,
          SPECTROSCOPY: OrdKit::Exporter::Actions::Analysis::SpectroscopyExporter,
          SPECTROMETRY: OrdKit::Exporter::Actions::Analysis::SpectrometryExporter,
        }.stringify_keys

        private

        def action_type_attributes
          { analysis: analysis_action }
        end

        def automation
          Automation::AutomationMode.const_get workup['automation'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end

        def analysis_action
          { automation: automation }.merge(
            ANALYSIS_EXPORTER[workup['analysis_type']]&.new(workup)&.to_ord || {},
          )
        end
      end
    end
  end
end
