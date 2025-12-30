# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class GasExchangeActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            gas_exchange: OrdKit::ReactionProcessAction::ActionGasExchange.new(gas_type:
                        OrdKit::Exporter::Samples::OntologySolventsWithRatioExporter.new(workup['gas_type']).to_ord),
          }
        end
      end
    end
  end
end

#   message ActionGasExchange { OntologyMaterialWithRatio gas_type = 1; }
