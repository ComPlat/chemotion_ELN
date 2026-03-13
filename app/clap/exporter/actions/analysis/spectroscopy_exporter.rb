# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Analysis
        class SpectroscopyExporter < Actions::Base
          private

          def action_type_attributes
            { analysis_spectroscopy:
            ReactionProcessAction::ActionAnalysisSpectroscopy.new({

                                                                    molecular_entities: molecular_entities,
                                                                    samples: samples,
                                                                    solvents: solvents,
                                                                  }) }
          end

          def samples
            Array(workup['samples']).map do |sample|
              Clap::Sample.new(label: sample['label'])
            end
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              Clap::Sample.new(
                label: sample['label'],
              )
            end
          end

          def solvents
            Clap::Exporter::Samples::SolventsWithRatioExporter.new(workup['solvents']).to_clap
          end
        end
      end
    end
  end
end
