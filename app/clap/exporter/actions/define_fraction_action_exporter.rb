# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class DefineFractionActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            define_fraction: Clap::ReactionProcessAction::ActionDefineFraction.new(
              fraction: Clap::Exporter::Samples::FractionExporter.new(action.consumed_fraction).to_clap,
            ),
          }
        end
      end
    end
  end
end
