# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class AddActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            addition: Clap::ReactionProcessAction::ActionAdd.new(
              sample: sample,
              addition_speed_type: addition_speed_type,
              flow_rate: flow_rate,
              addition_conditions: addition_conditions,
            ),
          }
        end

        def sample
          Clap::Exporter::Samples::SampleInActionExporter.new(action).to_clap
        end

        def addition_speed_type
          Clap::ReactionProcessAction::ActionAdd::AdditionSpeedType.const_get(workup['addition_speed_type'].to_s)
        rescue NameError
          Clap::ReactionProcessAction::ActionAdd::AdditionSpeedType::UNSPECIFIED
        end

        def flow_rate
          return if workup['VELOCITY'].blank?

          Clap::Exporter::Metrics::FlowRateExporter.new(workup['VELOCITY']).to_clap
        end

        def addition_conditions
          conditions_workup = workup.slice('TEMPERATURE', 'PRESSURE')

          Clap::Exporter::Conditions::ReactionConditionsExporter.new(conditions_workup).to_clap
        end
      end
    end
  end
end
