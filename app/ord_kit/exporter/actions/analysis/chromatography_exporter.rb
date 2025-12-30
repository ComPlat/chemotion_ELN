# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class ChromatographyExporter < OrdKit::Exporter::Actions::Purification::ChromatographyExporter
          # Chromatography for Analysis is compatible to Purification,  reuse exporter
        end
      end
    end
  end
end
