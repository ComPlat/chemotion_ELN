# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class PowerExporter < Clap::Exporter::Metrics::Base
        def to_clap
          Power.new(
            value: @value.to_f,
            precision: nil,
            unit: clap_unit,
          )
        end

        private

        def clap_unit
          Power::PowerUnit.const_get @unit.to_s
        rescue NameError
          Power::PowerUnit::UNSPECIFIED
        end
      end
    end
  end
end
