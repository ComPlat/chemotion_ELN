# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class LengthExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          Length.new(
            value: value.to_f,
            precision: nil,
            units: units,
          )
        end

        private

        def units
          Length::LengthUnit.const_get unit.to_s
        rescue NameError
          Length::LengthUnit::UNSPECIFIED
        end
      end
    end
  end
end
