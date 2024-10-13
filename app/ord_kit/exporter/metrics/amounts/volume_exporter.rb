# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      module Amounts
        class VolumeExporter < OrdKit::Exporter::Metrics::Base
          ORD_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            l: 'LITER',
            ml: 'MILLILITER',
            mcl: 'MICROLITER',
            nl: 'NANOLITER',
          }.stringify_keys.freeze

          def to_ord
            Volume.new(
              value: @value.to_f,
              precision: nil,
              unit: unit,
            )
          end

          private

          def unit
            Volume::VolumeUnit.const_get ORD_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Volume::VolumeUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
