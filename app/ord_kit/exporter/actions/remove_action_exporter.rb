# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class RemoveActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            removal: OrdKit::ReactionProcessAction::ActionRemove.new(
              reaction_role: workup['acts_as'],
              input: Actions::Samples::RemoveSampleExporter.new(action).to_ord,
              replacement_medium: workup['replacement_medium'],
              remove_repetitions: remove_repetitions,
            ),
          }
        end

        def remove_repetitions
          workup['remove_repetitions'] && workup['value']
        end
      end
    end
  end
end
