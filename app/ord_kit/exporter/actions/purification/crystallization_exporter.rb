# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class CrystallizationExporter < OrdKit::Exporter::Actions::Purification::Base
          def to_ord
            {
              crystallization: {
                # crystallization has only 1 purification_step but it is wrapped in an array for consistency.
                solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(
                  workup.dig('purification_steps', 0, 'solvents'),
                ).to_ord,
                amount: Metrics::AmountExporter.new(workup['amount']).to_ord,
                temperature: Metrics::TemperatureExporter.new(workup['TEMPERATURE']).to_ord,
                heating_duration: Metrics::TimeSpanExporter.new(workup['heating_duration']).to_ord,
                cooling_duration: Metrics::TimeSpanExporter.new(workup['cooling_duration']).to_ord,
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
