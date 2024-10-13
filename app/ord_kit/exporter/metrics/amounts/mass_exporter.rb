# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      module Amounts
        class MassExporter < OrdKit::Exporter::Metrics::Base
          ORD_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            kg: 'KILOGRAM',
            g: 'GRAM',
            mg: 'MILLIGRAM',
            mcg: 'MICROGRAM',
          }.stringify_keys.freeze

          def to_ord
            Mass.new(
              value: @value.to_f,
              precision: nil,
              unit: unit,
            )
          end

          private

          def unit
            Mass::MassUnit.const_get ORD_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Mass::MassUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
