# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Samples
        class AddSampleExporter < OrdKit::Exporter::Actions::Samples::Base
          private

          delegate :workup, to: :@action

          def components
            [
              OrdKit::Exporter::Compounds::AddCompoundExporter.new(@action).to_ord,
            ]
          end

          def addition_order
            # ELN is 0-indexed, ORD is 1-indexed.
            action.siblings.select(&:adds_compound?).index(@action) + 1
          rescue StandardError
            Rails.logger.error('Error on determining addition_order in action:')
            Rails.logger.error(action)
            0
          end

          def conditions
            conditions_workup = { TEMPERATURE: workup['TEMPERATURE'],
                                  PRESSURE: workup['PRESSURE'] }.stringify_keys
            OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(conditions_workup).to_ord
          end

          def addition_temperature
            return if workup['TEMPERATURE']&.value.blank?

            OrdKit::Exporter::Metrics::TemperatureExporter.new(workup['TEMPERATURE']).to_ord
          end

          def addition_pressure
            return if workup['PRESSURE'].blank?

            OrdKit::Exporter::Metrics::PressureExporter.new(workup['PRESSURE']).to_ord
          end

          def flow_rate
            return if workup['VELOCITY'].blank?

            OrdKit::Exporter::Metrics::FlowRateExporter.new(workup['VELOCITY']).to_ord
          end

          def addition_speed
            return if workup['addition_speed_type'].blank?

            OrdKit::Exporter::Metrics::AdditionSpeedTypeExporter.new(workup['addition_speed_type']).to_ord
          end
        end
      end
    end
  end
end
