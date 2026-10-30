# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Purification
        class FiltrationExporter < Clap::Exporter::Actions::Base
          private

          def action_type_attributes
            {
              filtration: Clap::ReactionProcessAction::ActionFiltration.new(
                filtration_mode: filtration_mode,
                steps: steps,
              ),
            }
          end

          def filtration_mode
            Clap::ReactionProcessAction::ActionFiltration::FiltrationMode
              .const_get workup['filtration_mode'].to_s
          rescue NameError
            Clap::ReactionProcessAction::ActionFiltration::FiltrationMode::UNSPECIFIED
          end

          def steps
            Array(workup['purification_steps']).map do |filtration_step|
              Clap::ReactionProcessAction::ActionFiltration::FiltrationStep.new(
                solvents: Clap::Exporter::Samples::SolventsWithRatioExporter.new(filtration_step['solvents']).to_clap,
                amount: Metrics::AmountExporter.new(filtration_step['amount']).to_clap,
                repetitions: filtration_step['repetitions']['value'],
                rinse_vessel: filtration_step['rinse_vessel'],
                duration: Metrics::TimeSpanExporter.new(filtration_step['duration']).to_clap,
              )
            end
          end
        end
      end
    end
  end
end
