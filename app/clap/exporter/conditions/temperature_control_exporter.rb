# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class TemperatureControlExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity ("CONDITION / TEMPERATURE")

        def to_clap
          TemperatureControl.new(
            temperature_control_type: temperature_control_type,
            temperature: temperature,
          )
        end

        private

        def temperature
          Exporter::Metrics::TemperatureExporter.new(workup).to_clap
        end

        def temperature_control_type
          TemperatureControl::TemperatureControlType.const_get workup['additional_information'].to_s
        rescue NameError
          TemperatureControl::TemperatureControlType::UNSPECIFIED
        end
      end
    end
  end
end
