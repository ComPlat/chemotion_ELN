# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class TemperatureExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          Temperature.new(
            value: value.to_f,
            precision: nil, # hardcoded empty
            units: temperature_unit,
          )
        end

        private

        def temperature_unit
          Temperature::TemperatureUnit.const_get unit.to_s
        rescue NameError
          Temperature::TemperatureUnit::UNSPECIFIED
        end
      end
    end
  end
end
