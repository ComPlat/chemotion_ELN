# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Samples
        class Base
          def initialize(action)
            @action = action
          end

          def to_ord
            OrdKit::ReactionInput.new(
              components: components,
              addition_order: addition_order,
              addition_duration: addition_duration,
              addition_speed: addition_speed,
              flow_rate: flow_rate,
              conditions: conditions,
            )
          end

          private

          attr_reader :action

          def conditions
            OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(action.workup).to_ord
          end

          def components
            raise StandardError, "Don't call #to_ord on abstract OrdKit::Exporter::Actions::Samples::Base"
          end

          def addition_duration
            Metrics::TimeSpanExporter.new(action.workup['duration']).to_ord
          end

          # Override where applicable (i.e. Actions ADD)
          def addition_order; end
          def addition_pressure; end
          def addition_speed; end
          def addition_temperature; end
          def flow_rate; end
        end
      end
    end
  end
end
