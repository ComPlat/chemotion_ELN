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
            Array(workup['filtration_steps']).map do |filtration_step|
              OrdKit::ReactionProcessAction::ActionFiltration::FiltrationStep.new(
                solvents: solvents_with_ratio(filtration_step['solvents']),
                amount: Metrics::AmountExporter.new(filtration_step['amount']).to_ord,
                repetitions: filtration_step['repetitions']['value'],
                rinse_vessel: filtration_step['rinse_vessel'],
                flow_rate: OrdKit::Exporter::Metrics::FlowRateExporter.new(filtration_step['flow_rate']).to_ord,
                duration: OrdKit::Time.new(
                  value: filtration_step['duration'].to_i / 1000,
                  precision: nil,
                  units: OrdKit::Time::TimeUnit::SECOND,
                ),
              )
            end
          end

          def solvents_with_ratio(solvents)
            Array(solvents).map do |solvent|
              OrdKit::CompoundWithRatio.new(
                compound: Compounds::PurifySampleOrDiverseSolventExporter.new(solvent['id']).to_ord,
                ratio: solvent['ratio'].to_s,
              )
            end
          end
        end
      end
    end
  end
end
