# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class ReactionConditionsExporter < Clap::Exporter::Conditions::Base
        def to_clap
          return unless workup

          ReactionConditions.new(
            temperature: temperature,
            ph: ph,
            pressure: pressure,
            stirring: stirring,
            illumination: illumination,
            electrochemistry: electrochemistry,
            details: condition_details,
            wavelengths: wavelengths,
            generic: generic_conditions,
          )
        rescue StandardError => e
          Rails.logger.error('ReactionConditionsExporter: WORKUP ERROR')
          Rails.logger.error(e)

          Rails.logger.error(workup)
          nil
        end

        def temperature
          return if workup['TEMPERATURE'].blank?

          Conditions::TemperatureConditionsExporter.new(workup['TEMPERATURE']).to_clap
        end

        def pressure
          return if workup['PRESSURE'].blank?

          Conditions::PressureConditionsExporter.new(workup['PRESSURE']).to_clap
        end

        def stirring
          return if workup['MOTION'].blank?

          Conditions::MotionConditionsExporter.new(workup['MOTION']).to_clap
        end

        def illumination
          return if workup['IRRADIATION'].blank?

          Conditions::IrradiationConditionsExporter.new(workup['IRRADIATION']).to_clap
        end

        def electrochemistry
          nil # n/a. Electrochemistry unknown in ELN Editor.
        end

        def ph
          return if workup['PH'].blank?

          Conditions::PhAdjustConditionsExporter.new(workup['PH']).to_clap
        end

        def wavelengths
          return if workup['WAVELENGTHS'].blank?

          Metrics::WavelengthRangeExporter.new(workup['WAVELENGTHS']).to_clap
        end

        def generic_conditions
          return if workup['MS_PARAMETER'].blank?

          [Clap::GenericConditions.new(name: 'MS_PARAMETER', conditions: workup['MS_PARAMETER'])]
        end

        def condition_details
          nil # n/a unkown in ELN Editor.
        end
      end
    end
  end
end
