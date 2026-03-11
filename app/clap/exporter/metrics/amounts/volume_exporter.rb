# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      module Amounts
        class VolumeExporter < Clap::Exporter::Metrics::Base
          CLAP_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            l: 'LITER',
            ml: 'MILLILITER',
            mcl: 'MICROLITER',
            nl: 'NANOLITER',
          }.stringify_keys.freeze

          def to_clap
            Volume.new(
              value: @value.to_f,
              precision: nil,
              unit: unit,
            )
          end

          private

          def unit
            Volume::VolumeUnit.const_get CLAP_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Volume::VolumeUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
