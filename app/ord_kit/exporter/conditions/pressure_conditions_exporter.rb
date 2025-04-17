# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class PressureConditionsExporter < OrdKit::Exporter::Conditions::Base
        # Works on ReactionProcessActivity ("CONDITION / PRESSURE")

        def to_ord
          OrdKit::PressureConditions.new(
            control: control,
            setpoint: setpoint || OrdKit::Pressure.new,
            atmosphere: atmosphere,
            measurements: measurements,
          )
        end

        private

        def control
          nil # n/a. Unknown in ELN.
        end

        def setpoint
          return if workup['value'].blank?

          OrdKit::Pressure.new(
            value: workup['value'].to_f,
            unit: OrdKit::Pressure::PressureUnit.const_get(workup['unit']),
          )
        end

        def atmosphere
          nil # n/a. Unknown in ELN.
        end

        def measurements
          nil # n/a. Unknown in ELN.
        end
      end
    end
  end
end
