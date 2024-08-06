# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purify
        class CrystallizationExporter < OrdKit::Exporter::Actions::Purify::Base
          def to_ord
            {
              crystallization: {
                # crystallization has only 1 purify_step but it is wrapped in an array for consistency.
                solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(
                  workup.dig('purify_steps', 0, 'solvents'),
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
            ReactionProcessAction::ActionCrystallization::CrystallizationMode.const_get workup['crystallization_mode'].to_s
          rescue NameError
            ReactionProcessAction::ActionCrystallization::CrystallizationMode::UNSPECIFIED
          end
        end
      end
    end
  end
end
