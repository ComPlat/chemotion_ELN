# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class ReactionConditionsExporter < Clap::Exporter::Conditions::Base
        def to_clap
          return unless workup

          ReactionConditions.new(
            temperature_control: temperature_control,
            ph_control: ph_control,
            pressure_control: pressure_control,
            motion_control: motion_control,
            irradiation_control: irradiation_control,
            wavelengths: wavelengths,
            generic: generic_conditions,
          )
        end

        def temperature_control
          return if workup['TEMPERATURE'].blank?

          Conditions::TemperatureControlExporter.new(workup['TEMPERATURE']).to_clap
        end

        def pressure_control
          return if workup['PRESSURE'].blank?

          Conditions::PressureControlExporter.new(workup['PRESSURE']).to_clap
        end

        def motion_control
          return if workup['MOTION'].blank?

          Conditions::MotionControlExporter.new(workup['MOTION']).to_clap
        end

        def irradiation_control
          return if workup['IRRADIATION'].blank?

          Conditions::IrradiationControlExporter.new(workup['IRRADIATION']).to_clap
        end

        def ph_control
          return if workup['PH'].blank?

          Conditions::PhAdjustControlExporter.new(workup['PH']).to_clap
        end

        def wavelengths
          return if workup['WAVELENGTHS'].blank?

          Metrics::WavelengthRangeExporter.new(workup['WAVELENGTHS']).to_clap
        end

        def generic_conditions
          return if workup['MS_PARAMETER'].blank?

          [Clap::GenericConditions.new(name: 'MS_PARAMETER', conditions: workup['MS_PARAMETER'])]
        end
      end
    end
  end
end
