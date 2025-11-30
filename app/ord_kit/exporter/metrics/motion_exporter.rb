# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class MotionExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          Motion.new(
            value: @value.to_f,
            precision: nil,
            unit: motion_unit,
          )
        end

        private

        def motion_unit
          Motion::MotionUnit.const_get @unit.to_s
        rescue NameError
          Motion::MotionUnit::UNSPECIFIED
        end
      end
    end
  end
end
