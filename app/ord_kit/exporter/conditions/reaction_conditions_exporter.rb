# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class ReactionConditionsExporter < OrdKit::Exporter::Conditions::Base
        def to_ord
          return unless workup

          ReactionConditions.new(
            temperature: temperature,
            ph: ph,
            pressure: pressure,
            stirring: stirring,
            illumination: illumination,
            electrochemistry: electrochemistry,
            conditions_are_dynamic: conditions_are_dynamic,
            details: condition_details,
          )
        end

        def temperature
          return if workup['TEMPERATURE'].blank?

          Conditions::TemperatureConditionsExporter.new(workup['TEMPERATURE']).to_ord
        end

        def pressure
          return if workup['PRESSURE'].blank?

          Conditions::PressureConditionsExporter.new(workup['PRESSURE']).to_ord
        end

        def stirring
          return if workup['MOTION'].blank?

          Conditions::MotionConditionsExporter.new(workup['MOTION']).to_ord
        end

        def illumination
          return if workup['IRRADIATION'].blank?

          Conditions::IrradiationConditionsExporter.new(workup['IRRADIATION']).to_ord
        end

        def electrochemistry
          nil # n/a. Electrochemistry unknown in ELN Editor.
        end

        def ph
          return if workup['PH'].blank?

          Conditions::PhAdjustConditionsExporter.new(workup['PH']).to_ord
        end

        def conditions_are_dynamic
          nil # n/a. Unknown in ELN Editor
        end

        def condition_details
          nil # n/a unkown in ELN Editor.
        end
      end
    end
  end
end
