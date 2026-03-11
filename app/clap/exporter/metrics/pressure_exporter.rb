# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class PressureExporter < Clap::Exporter::Metrics::Base
        def to_clap
          Pressure.new(
            value: @value.to_f,
            precision: nil,
            unit: Pressure::PressureUnit.const_get(@unit.to_s),
          )
        end
      end
    end
  end
end
