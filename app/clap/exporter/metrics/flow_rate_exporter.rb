# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class FlowRateExporter < Clap::Exporter::Metrics::Base
        CLAP_UNIT_MAPPING = {
          UNSPECIFIED: 'UNSPECIFIED',
          MLMIN: 'MILLILITER_PER_MINUTE',
        }.stringify_keys.freeze

        def to_clap
          return unless @value

          FlowRate.new(
            value: @value.to_f,
            unit: flow_rate_unit,
          )
        end

        private

        def flow_rate_unit
          FlowRate::FlowRateUnit.const_get CLAP_UNIT_MAPPING[@unit].to_s
        rescue NameError
          FlowRate::FlowRateUnit::UNSPECIFIED
        end
      end
    end
  end
end
