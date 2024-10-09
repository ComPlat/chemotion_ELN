# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class ChromatographyExporter < OrdKit::Exporter::Actions::Purification::ChromatographyExporter
          # Measurment CHromatography is sufficiently similar to Purification that the exporter can be reused for nwo.
        end
      end
    end
  end
end
