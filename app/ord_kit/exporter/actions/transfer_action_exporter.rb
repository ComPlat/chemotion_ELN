# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class TransferActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            transfer: OrdKit::ReactionProcessAction::ActionTransfer.new(
              sample: sample,
              source_reaction_step_id: workup['source_step_id'],
              target_reaction_step_id: workup['target_step_id'],
              amount: amount,
              percentage: percentage,
            ),
          }
        end

        def sample
          OrdKit::Exporter::Samples::SampleInActionExporter.new(@action).to_ord
        end

        def amount
          Metrics::AmountExporter.new(workup['target_amount']).to_ord
        end

        def percentage
          # percentage as fraction of the original sample amount (piggybacked from frontend onto workup.target_amount).
          percentage_workup = { value: workup.dig('target_amount', 'percentage'), unit: 'PERCENT' }.stringify_keys
          Metrics::Amounts::PercentageExporter.new(percentage_workup).to_ord
        end
      end
    end
  end
end
