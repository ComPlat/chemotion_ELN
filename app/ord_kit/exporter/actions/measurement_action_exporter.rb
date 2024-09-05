# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class MeasurementActionExporter < OrdKit::Exporter::Actions::Base
        # Measurment data is congruent to Purify data, we can reuse the exporters.
        MEASUREMENT_EXPORTER = {
          CHROMATOGRAPHY: OrdKit::Exporter::Actions::Purify::ChromatographyExporter,
          EXTRACTION: OrdKit::Exporter::Actions::Purify::ExtractionExporter,
          FILTRATION: OrdKit::Exporter::Actions::Purify::FiltrationExporter,
        }.stringify_keys

        private

        def action_type_attributes
          { measurement: measurement_action }
        end

        def automation
          Automation::AutomationMode.const_get workup['automation'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end

        def measurement_action
          { automation: automation }.merge(
            MEASUREMENT_EXPORTER[workup['purify_type']].new(workup).to_ord,
          )
        end
      end
    end
  end
end
