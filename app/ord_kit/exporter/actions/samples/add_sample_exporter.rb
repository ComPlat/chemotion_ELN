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
          end

          def conditions
            conditions_workup = { TEMPERATURE: workup['add_sample_temperature'],
                                  PRESSURE: workup['add_sample_pressure'] }.stringify_keys
            OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(conditions_workup).to_ord
          end

          def addition_temperature
            return if workup['add_sample_temperature_value'].blank?

            OrdKit::Exporter::Metrics::TemperatureExporter.new(workup['add_sample_temperature']).to_ord
          end

          def addition_pressure
            return if workup['add_sample_pressure'].blank?

            OrdKit::Exporter::Metrics::PressureExporter.new(workup['add_sample_pressure']).to_ord
          end

          def flow_rate
            return if workup['add_sample_velocity'].blank?

            OrdKit::Exporter::Metrics::FlowRateExporter.new(workup['add_sample_velocity']).to_ord
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
