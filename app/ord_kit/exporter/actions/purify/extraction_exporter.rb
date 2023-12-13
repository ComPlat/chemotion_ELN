# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purify
        class ExtractionExporter < OrdKit::Exporter::Actions::Purify::Base
          def to_ord
            {
              extraction: {
                phase: extraction_phase,
                steps: steps,
              },
            }
          end

          def steps
            Array(workup['extraction_steps']).map do |extraction_step|
              OrdKit::ReactionProcessAction::ActionExtraction::ExtractionStep.new(
                solvents: solvents_with_ratio(extraction_step['solvents']),
                amount: Metrics::AmountExporter.new(extraction_step['amount']).to_ord,
                flow_rate: OrdKit::Exporter::Metrics::FlowRateExporter.new(extraction_step['flow_rate']).to_ord,
                duration: OrdKit::Time.new(
                  value: extraction_step['duration'].to_i / 1000,
                  precision: nil,
                  units: OrdKit::Time::TimeUnit::SECOND,
                ),
              )
            end
          end

          def solvents_with_ratio(solvents)
            solvents&.map do |solvent|
              OrdKit::CompoundWithRatio.new(
                compound: OrdKit::Exporter::Compounds::PurifySampleOrDiverseSolventExporter.new(solvent['id']).to_ord,
                ratio: solvent['ratio'].to_s,
              )
            end
          end

          def extraction_phase
            ReactionProcessAction::ActionExtraction::ExtractionPhase.const_get workup['phase'].to_s
          rescue NameError
            ReactionProcessAction::ActionExtraction::ExtractionPhase::UNSPECIFIED
          end
        end
      end
    end
  end
end
