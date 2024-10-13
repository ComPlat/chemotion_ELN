# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class ChromatographyExporter < OrdKit::Exporter::Actions::Purification::ChromatographyExporter
          # Analysis Chromatography is sufficiently similar to Purification to reuse exporter
        end
      end
    end
  end
end
