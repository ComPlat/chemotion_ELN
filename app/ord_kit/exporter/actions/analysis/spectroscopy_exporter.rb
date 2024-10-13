# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class SpectroscopyExporter < Purification::ChromatographyExporter
          def to_ord
            { spectroscopy: ReactionProcessAction::ActionSpectroscopy.new({ device: workup['device'] }) }
          end
        end
      end
    end
  end
end
