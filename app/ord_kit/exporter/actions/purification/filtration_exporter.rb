# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class FiltrationExporter < OrdKit::Exporter::Actions::Purification::Base
          def to_ord
            {
              filtration: OrdKit::ReactionProcessAction::ActionPurificationFiltration.new(
                filtration_mode: filtration_mode,
                steps: steps,
              ),
            }
          end

          private

          def filtration_mode
            OrdKit::ReactionProcessAction::ActionPurificationFiltration::FiltrationMode
              .const_get workup['filtration_mode'].to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionPurificationFiltration::FiltrationMode::UNSPECIFIED
          end

          def steps
            Array(workup['purification_steps']).map do |filtration_step|
              OrdKit::ReactionProcessAction::ActionPurificationFiltration::FiltrationStep.new(
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
