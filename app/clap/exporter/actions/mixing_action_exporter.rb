# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class MixingActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            mixing: Clap::ReactionProcessAction::ActionMixing.new(
              { speed: Metrics::MotionExporter.new(workup['speed']).to_clap },
            ),
          }
        end
      end
    end
  end
end
