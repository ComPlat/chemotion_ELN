# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class TemperatureConditionsExporter < OrdKit::Exporter::Conditions::Base
        # Works on ReactionProcessActivity ("CONDITION / TEMPERATURE")

        def to_ord
          TemperatureConditions.new(
            control: temperature_control,
            setpoint: setpoint,
            measurements: measurements,
          )
        end

        private

        def setpoint
          Exporter::Metrics::TemperatureExporter.new(workup).to_ord
        end

        def temperature_control
          return unless workup['additional_information']

          TemperatureConditions::TemperatureControl.new(
            type: temperature_control_type,
            details: nil, # n/a. Unknown in ELN.
          )
        end

        def measurements
          nil # n/a. Unknown in ELN.
        end

        def temperature_control_type
          TemperatureConditions::TemperatureControl::TemperatureControlType.const_get workup['additional_information']
        rescue NameError
          TemperatureConditions::TemperatureControl::TemperatureControlType::UNSPECIFIED
        end
      end
    end
  end
end
