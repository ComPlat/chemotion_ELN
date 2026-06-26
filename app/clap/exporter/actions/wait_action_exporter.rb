# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class WaitActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            wait: Clap::ReactionProcessAction::ActionWait.new(duration: duration),
          }
        end
      end
    end
  end
end
