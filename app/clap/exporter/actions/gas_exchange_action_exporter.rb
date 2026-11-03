# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class GasExchangeActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            gas_exchange: Clap::ReactionProcessAction::ActionGasExchange.new(gas_type:
                        Clap::Exporter::Samples::SolventsWithRatioExporter.new(workup['gas_type']).to_clap),
          }
        end
      end
    end
  end
end
