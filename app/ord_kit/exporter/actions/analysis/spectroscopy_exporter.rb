# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Analysis
        class SpectroscopyExporter < Purification::Base
          def to_ord
            { spectroscopy:
            ReactionProcessAction::ActionAnalysisSpectroscopy.new({
                                                                    device: workup['device'],
                                                                    molecular_entities: molecular_entities,
                                                                    sample: sample,
                                                                  }) }
          end

          private

          def sample
            OrdKit::Exporter::Compounds::SaveCompoundExporter.new(@action).to_ord if @action.sample
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              OrdKit::Exporter::Samples::SampleExporter.new(sample).to_ord
            end
          end
        end
      end
    end
  end
end
