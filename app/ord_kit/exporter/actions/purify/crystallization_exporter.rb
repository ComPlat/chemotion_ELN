# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purify
        class CrystallizationExporter < OrdKit::Exporter::Actions::Purify::Base
          def to_ord
            {
              crystallization: {
                solvents: solvents_with_ratio(workup['solvents']),
                amount: Metrics::AmountExporter.new(workup['amount']).to_ord,
                temperature: Metrics::TemperatureExporter.new(workup['TEMPERATURE']).to_ord,
                heating_duration: duration(workup['heating_duration']),
                cooling_duration: duration(workup['cooling_duration']),
                crystallization_mode: crystallization_mode,
              },
            }
          end

          def solvents_with_ratio(solvents)
            solvents&.map do |solvent|
              sample = Medium::Additive.find_by(id: solvent['id'])

              OrdKit::CompoundWithRatio.new(
                compound: OrdKit::Exporter::Compounds::PurifyCompoundExporter.new(sample).to_ord,
                ratio: solvent['ratio'].to_s,
              )
            end
          end

          def duration(milliseconds)
            OrdKit::Time.new(
              value: milliseconds.to_i / 1000,
              precision: nil,
              units: OrdKit::Time::TimeUnit::SECOND,
            )
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
