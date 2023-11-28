# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module SaveSample
        class PurificationOriginExporter
          def initialize(action)
            @workup = action.workup
          end

          attr_reader :workup

          def to_clap
            {
              origin_action_id: workup['sample_origin_action_id'],
              origin_purification_step_position: workup.dig('sample_origin_purification_step', 'position'),
              amount: Metrics::AmountExporter.new(workup['solvents_amount']).to_clap,
              solvents: solvents_to_clap(workup['solvents']),
              extra_solvents: solvents_to_clap(workup['extra_solvents']),
            }
          end

          private

          def solvents_to_clap(solvents)
            Array(solvents).map do |solvent|
              Clap::Exporter::Samples::SampleExporter.new(solvent).to_clap
            end
          end
        end
      end
    end
  end
end
