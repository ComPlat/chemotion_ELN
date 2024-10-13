# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class WavelengthExporter < OrdKit::Exporter::Metrics::Base
        ORD_UNIT_MAPPING = {
          UNSPECIFIED: 'UNSPECIFIED',
          NM: 'NANOMETER',
          WAVENUMBER: 'WAVENUMBER',
        }.stringify_keys.freeze

        def to_ord
          Wavelength.new(
            value: @value.to_f,
            precision: nil,
            unit: unit,
          )
        end

        private

        def unit
          Wavelength::WavelengthUnit.const_get ORD_UNIT_MAPPING[@unit].to_s
        rescue NameError
          Wavelength::WavelengthUnit::UNSPECIFIED
        end
      end
    end
  end
end
