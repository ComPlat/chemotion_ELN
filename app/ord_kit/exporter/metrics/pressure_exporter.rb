# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class PressureExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          Pressure.new(
            value: value.to_f,
            precision: nil,
            units: Pressure::PressureUnit.const_get(unit),
          )
        end
      end
    end
  end
end
