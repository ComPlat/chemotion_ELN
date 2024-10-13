# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class LengthExporter < OrdKit::Exporter::Metrics::Base
        LENGTH_UNIT_MAPPING = { CM: 'CENTIMETER' }.stringify_keys.freeze

        def to_ord
          Length.new(
            value: @value.to_f,
            precision: nil,
            unit: unit,
          )
        end

        private

        def unit
          Length::LengthUnit.const_get LENGTH_UNIT_MAPPING[@unit.to_s].to_s
        rescue NameError
          Length::LengthUnit::UNSPECIFIED
        end
      end
    end
  end
end
