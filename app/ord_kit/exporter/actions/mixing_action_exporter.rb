# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class MixingActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            mixing: OrdKit::ReactionProcessAction::ActionMixing.new(
              { speed: Metrics::MotionExporter.new(workup['speed']).to_ord },
            ),
          }
        end
      end
    end
  end
end
