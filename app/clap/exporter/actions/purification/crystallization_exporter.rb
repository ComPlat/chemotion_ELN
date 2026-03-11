# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Purification
        class CrystallizationExporter < Clap::Exporter::Actions::Base
          private

          def action_type_attributes
            {
              crystallization: {
                # crystallization has only 1 purification_step but it is wrapped in an array for consistency.
                solvents: Clap::Exporter::Samples::SolventsWithRatioExporter.new(
                  workup.dig('purification_steps', 0, 'solvents'),
                ).to_clap,
                amount: Metrics::AmountExporter.new(workup['amount']).to_clap,
                temperature: Metrics::TemperatureExporter.new(workup['TEMPERATURE']).to_clap,
                heating_duration: Metrics::TimeSpanExporter.new(workup['heating_duration']).to_clap,
                cooling_duration: Metrics::TimeSpanExporter.new(workup['cooling_duration']).to_clap,
                crystallization_mode: crystallization_mode,
              },
            }
          end

          def crystallization_mode
            ReactionProcessAction::ActionCrystallization::CrystallizationMode
              .const_get workup['crystallization_mode'].to_s
          rescue NameError
            ReactionProcessAction::ActionCrystallization::CrystallizationMode::UNSPECIFIED
          end
        end
      end
    end
  end
end
