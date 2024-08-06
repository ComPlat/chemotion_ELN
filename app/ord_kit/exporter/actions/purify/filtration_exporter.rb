# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purify
        class FiltrationExporter < OrdKit::Exporter::Actions::Purify::Base
          def to_ord
            {
              filtration: OrdKit::ReactionProcessAction::ActionFiltration.new(
                filtration_mode: filtration_mode,
                steps: steps,
              ),
            }
          end

          private

          def filtration_mode
            OrdKit::ReactionProcessAction::ActionFiltration::FiltrationMode.const_get workup['filtration_mode'].to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionFiltration::FiltrationMode::UNSPECIFIED
          end

          def steps
            Array(workup['purify_steps']).map do |filtration_step|
              OrdKit::ReactionProcessAction::ActionFiltration::FiltrationStep.new(
                solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(filtration_step['solvents']).to_ord,
                amount: Metrics::AmountExporter.new(filtration_step['amount']).to_ord,
                repetitions: filtration_step['repetitions']['value'],
                rinse_vessel: filtration_step['rinse_vessel'],
                duration: Metrics::TimeSpanExporter.new(filtration_step['duration']).to_ord,
              )
            end
          end
        end
      end
    end
  end
end
