# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class PressureConditionsExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity ("CONDITION / PRESSURE")

        def to_clap
          Clap::PressureConditions.new(
            control: control,
            setpoint: setpoint || Clap::Pressure.new,
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

          Clap::Pressure.new(
            value: workup['value'].to_f,
            unit: Clap::Pressure::PressureUnit.const_get(workup['unit']),
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
