# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class SpectrometryExporter < Purification::ChromatographyExporter
          def to_ord
            { spectrometry: ReactionProcessAction::ActionSpectrometry.new({ device: workup['device'] }) }
          end
        end
      end
    end
  end
end
