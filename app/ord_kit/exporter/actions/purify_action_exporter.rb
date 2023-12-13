# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class PurifyActionExporter < OrdKit::Exporter::Actions::Base
        PURIFY_EXPORTER = {
          CHROMATOGRAPHY: OrdKit::Exporter::Actions::Purify::ChromatographyExporter,
          CRYSTALLIZATION: OrdKit::Exporter::Actions::Purify::CrystallizationExporter,
          EXTRACTION: OrdKit::Exporter::Actions::Purify::ExtractionExporter,
          FILTRATION: OrdKit::Exporter::Actions::Purify::FiltrationExporter,
        }.stringify_keys

        private

        def action_type_attributes
          { purify: purify_type_action }
        end

        def automation
          Automation::AutomationMode.const_get workup['automation'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end

        def purify_type_action
          { automation: automation }.merge(
            PURIFY_EXPORTER[workup['purify_type']].new(workup).to_ord,
          )
        end
      end
    end
  end
end
