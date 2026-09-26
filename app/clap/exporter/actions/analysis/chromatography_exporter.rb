# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Analysis
        class ChromatographyExporter < Clap::Exporter::Actions::Purification::ChromatographyExporter
          # Chromatography for Analysis is compatible to Purification,  reuse exporter
        end
      end
    end
  end
end
