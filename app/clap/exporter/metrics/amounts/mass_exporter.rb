# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      module Amounts
        class MassExporter < Clap::Exporter::Metrics::Base
          CLAP_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            kg: 'KILOGRAM',
            g: 'GRAM',
            mg: 'MILLIGRAM',
            mcg: 'MICROGRAM',
          }.stringify_keys.freeze

          def to_clap
            Mass.new(
              value: @value.to_f,
              precision: nil,
              unit: unit,
            )
          end

          private

          def unit
            Mass::MassUnit.const_get CLAP_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Mass::MassUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
