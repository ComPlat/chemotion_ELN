# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class ExtractionExporter < OrdKit::Exporter::Actions::Purification::Base
          def to_ord
            {
              extraction: {
                phase: extraction_phase,
                steps: steps,
              },
            }
          end

          def steps
            Array(workup['purification_steps']).map do |extraction_step|
              OrdKit::ReactionProcessAction::ActionExtraction::ExtractionStep.new(
                solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(extraction_step['solvents']).to_ord,
                amount: Metrics::AmountExporter.new(extraction_step['amount']).to_ord,
                flow_rate: Metrics::FlowRateExporter.new(extraction_step['flow_rate']).to_ord,
                duration: Metrics::TimeSpanExporter.new(extraction_step['duration']).to_ord,
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
