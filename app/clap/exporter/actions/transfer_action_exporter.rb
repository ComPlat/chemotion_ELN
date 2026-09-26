# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class TransferActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            transfer: Clap::ReactionProcessAction::ActionTransfer.new(
              sample: sample,
              source_reaction_step_id: workup['source_step_id'],
              target_reaction_step_id: workup['target_step_id'],
              amount: amount,
              percentage: percentage,
            ),
          }
        end

        def sample
          Clap::Exporter::Samples::SampleInActionExporter.new(@action).to_clap
        end

        def amount
          Metrics::AmountExporter.new(workup['target_amount']).to_clap
        end

        def percentage
          # percentage as fraction of the original sample amount (piggybacked from frontend onto workup.target_amount).
          percentage_workup = { value: workup.dig('target_amount', 'percentage'), unit: 'PERCENT' }.stringify_keys
          Metrics::Amounts::PercentageExporter.new(percentage_workup).to_clap
        end
      end
    end
  end
end
