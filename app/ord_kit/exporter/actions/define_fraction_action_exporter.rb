# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class DefineFractionActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            define_fraction: OrdKit::ReactionProcessAction::ActionDefineFraction.new(
              fraction: OrdKit::Exporter::Samples::FractionExporter.new(action.consumed_fraction).to_ord,
            ),
          }
        end
      end
    end
  end
end
