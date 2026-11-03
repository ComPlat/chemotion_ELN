# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class LengthExporter < Clap::Exporter::Metrics::Base
        LENGTH_UNIT_MAPPING = { CM: 'CENTIMETER' }.stringify_keys.freeze

        def to_clap
          return unless @value

          Length.new(
            value: @value.to_f,
            precision: nil,
            unit: clap_unit,
          )
        end

        private

        def clap_unit
          Length::LengthUnit.const_get LENGTH_UNIT_MAPPING[@unit.to_s].to_s
        rescue NameError
          Length::LengthUnit::UNSPECIFIED
        end
      end
    end
  end
end
