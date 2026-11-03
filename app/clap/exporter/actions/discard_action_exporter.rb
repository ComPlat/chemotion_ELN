# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class DiscardActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            discard:
            Clap::ReactionProcessAction::ActionDiscard.new(fraction:
                 Clap::Exporter::Samples::FractionExporter.new(action.consumed_fraction).to_clap),
          }
        end
      end
    end
  end
end
