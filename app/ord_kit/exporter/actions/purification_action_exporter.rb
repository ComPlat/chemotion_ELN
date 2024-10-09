# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class PurificationActionExporter < OrdKit::Exporter::Actions::Base
        PURIFICATION_EXPORTER = {
          CHROMATOGRAPHY: OrdKit::Exporter::Actions::Purification::ChromatographyExporter,
          CRYSTALLIZATION: OrdKit::Exporter::Actions::Purification::CrystallizationExporter,
          EXTRACTION: OrdKit::Exporter::Actions::Purification::ExtractionExporter,
          FILTRATION: OrdKit::Exporter::Actions::Purification::FiltrationExporter,
        }.stringify_keys

        private

        def action_type_attributes
          { purification: purification_type_action }
        end

        def automation
          Automation::AutomationMode.const_get workup['automation'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end

        def purification_type_action
          { automation: automation }.merge(
            PURIFICATION_EXPORTER[workup['purification_type']].new(workup).to_ord,
          )
        end
      end
    end
  end
end
