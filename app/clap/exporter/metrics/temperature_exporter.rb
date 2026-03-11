# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class TemperatureExporter < Clap::Exporter::Metrics::Base
        def to_clap
          Temperature.new(
            value: @value.to_f,
            precision: nil, # hardcoded empty
            unit: temperature_unit,
          )
        end

        private

        def temperature_unit
          Temperature::TemperatureUnit.const_get @unit.to_s
        rescue NameError
          Temperature::TemperatureUnit::UNSPECIFIED
        end
      end
    end
  end
end
