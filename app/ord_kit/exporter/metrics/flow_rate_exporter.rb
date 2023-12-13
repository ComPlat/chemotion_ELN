# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class FlowRateExporter < OrdKit::Exporter::Metrics::Base
        ORD_UNIT_MAPPING = {
          UNSPECIFIED: 'UNSPECIFIED',
          MLMIN: 'MILLILITER_PER_MINUTE',
        }.stringify_keys.freeze

        def to_ord
          FlowRate.new(
            value: value.to_f,
            precision: nil,
            units: flow_rate_unit,
          )
        end

        private

        def flow_rate_unit
          FlowRate::FlowRateUnit.const_get ORD_UNIT_MAPPING[unit].to_s
        rescue NameError
          FlowRate::FlowRateUnit::UNSPECIFIED
        end
      end
    end
  end
end
