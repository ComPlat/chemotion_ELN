# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class EvaporationActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            evaporation:
              OrdKit::ReactionProcessAction::ActionEvaporation.new(fractions: workup['fractions']&.map(&:to_s) || []),
          }
        end
      end
    end
  end
end
