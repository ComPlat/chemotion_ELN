# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class AddActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            addition: OrdKit::ReactionProcessAction::ActionAdd.new(
              reaction_role: workup['acts_as'],
              input: Samples::AddSampleExporter.new(action).to_ord,
            ),
          }
        end
      end
    end
  end
end
