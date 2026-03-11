# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class WavelengthExporter < Clap::Exporter::Metrics::Base
        CLAP_UNIT_MAPPING = {
          UNSPECIFIED: 'UNSPECIFIED',
          NM: 'NANOMETER',
          WAVENUMBER: 'WAVENUMBER',
        }.stringify_keys.freeze

        def to_clap
          Wavelength.new(
            value: @value.to_f,
            precision: nil,
            unit: unit,
          )
        end

        private

        def unit
          Wavelength::WavelengthUnit.const_get CLAP_UNIT_MAPPING[@unit].to_s
        rescue NameError
          Wavelength::WavelengthUnit::UNSPECIFIED
        end
      end
    end
  end
end
