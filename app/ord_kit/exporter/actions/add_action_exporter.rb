# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class AddActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            addition: OrdKit::ReactionProcessAction::ActionAdd.new(
              sample: sample,
              addition_speed_type: addition_speed_type,
              flow_rate: flow_rate,
              addition_conditions: addition_conditions,
            ),
          }
        end

        def sample
          OrdKit::Exporter::Samples::SampleInActionExporter.new(action).to_ord
        end

        def addition_speed_type
          OrdKit::ReactionProcessAction::ActionAdd::AdditionSpeedType.const_get(workup['addition_speed_type'].to_s)
        rescue NameError
          OrdKit::ReactionProcessAction::ActionAdd::AdditionSpeedType::UNSPECIFIED
        end

        def flow_rate
          return if workup['VELOCITY'].blank?

          OrdKit::Exporter::Metrics::FlowRateExporter.new(workup['VELOCITY']).to_ord
        end

        def addition_conditions
          conditions_workup = { TEMPERATURE: workup['TEMPERATURE'],
                                PRESSURE: workup['PRESSURE'] }.stringify_keys
          OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(conditions_workup).to_ord
        end
      end
    end
  end
end
