# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class ReactionConditionLimitsExporter < Clap::Exporter::Conditions::Base
        def to_clap
          return {} unless workup

          condition_workup = workup.dup
          duration = condition_workup.delete('duration')

          Clap::ReactionConditionLimits.new(
            duration: Clap::Exporter::Metrics::TimeSpanExporter.new(duration).to_clap,
            conditions: Clap::Exporter::Conditions::ReactionConditionsExporter.new(condition_workup).to_clap,
          )
        end
      end
    end
  end
end
