# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class PowerExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          Power.new(
            value: @value.to_f,
            precision: nil,
            unit: unit,
          )
        end

        private

        def unit
          Power::PowerUnit.const_get @unit.to_s
        rescue NameError
          Power::PowerUnit::UNSPECIFIED
        end
      end
    end
  end
end
