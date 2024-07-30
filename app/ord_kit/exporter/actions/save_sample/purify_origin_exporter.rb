# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module SaveSample
        class PurifyOriginExporter
          def initialize(action)
            @workup = action.workup
          end

          attr_reader :workup

          def to_ord
            {
              purify_origin_action_id: workup['sample_origin_action_id'],
              purify_origin_step_number: workup.dig('sample_origin_purify_step', 'position'),
              amount: Metrics::AmountExporter.new(workup['solvents_amount']).to_ord,
              solvents: solvents_to_ord(workup['solvents']),
              extra_solvents: solvents_to_ord(workup['extra_solvents']),
            }
          end

          private

          def solvents_to_ord(solvents)
            Array(solvents).map do |solvent|
              OrdKit::Exporter::Samples::SampleExporter.new(solvent).to_ord
            end
          end
        end
      end
    end
  end
end
