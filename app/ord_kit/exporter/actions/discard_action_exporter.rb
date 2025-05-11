# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class DiscardActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            discard:
            OrdKit::ReactionProcessAction::ActionDiscard.new(fractions: workup['fractions']&.map(&:to_s) || []),
          }
        end
      end
    end
  end
end
