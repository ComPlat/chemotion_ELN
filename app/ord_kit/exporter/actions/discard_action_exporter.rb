# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class DiscardActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            discard:
            OrdKit::ReactionProcessAction::ActionDiscard.new(fraction:
                 OrdKit::Exporter::Samples::FractionExporter.new(action.consumed_fraction).to_ord),
          }
        end
      end
    end
  end
end
