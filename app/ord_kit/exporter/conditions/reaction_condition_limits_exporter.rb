module OrdKit
  module Exporter
    module Conditions
      class ReactionConditionLimitsExporter < OrdKit::Exporter::Conditions::Base
        def to_ord
          return unless workup

          condition_workup = workup.dup
          duration = condition_workup.delete('duration')

          OrdKit::ReactionConditionLimits.new(
            duration: OrdKit::Exporter::Metrics::TimeSpanExporter.new(duration).to_ord,
            conditions: OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(condition_workup).to_ord,
          )
        end
      end
    end
  end
end
