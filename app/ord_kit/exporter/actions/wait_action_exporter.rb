# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class WaitActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            wait: OrdKit::ReactionProcessAction::ActionWait.new(duration: duration),
          }
        end
      end
    end
  end
end
