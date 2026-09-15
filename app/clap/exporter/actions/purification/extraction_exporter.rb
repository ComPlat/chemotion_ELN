# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Purification
        class ExtractionExporter < Clap::Exporter::Actions::Base
          private

          def action_type_attributes
            {
              extraction: {
                phase: extraction_phase,
                steps: steps,
              },
            }
          end

          def steps
            Array(workup['purification_steps']).map do |extraction_step|
              Clap::ReactionProcessAction::ActionExtraction::ExtractionStep.new(
                solvents: Clap::Exporter::Samples::SolventsWithRatioExporter.new(extraction_step['solvents']).to_clap,
                amount: Metrics::AmountExporter.new(extraction_step['amount']).to_clap,
                flow_rate: Metrics::FlowRateExporter.new(extraction_step['flow_rate']).to_clap,
                duration: Metrics::TimeSpanExporter.new(extraction_step['duration']).to_clap,
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
