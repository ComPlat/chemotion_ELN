# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class SaveSampleActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            save_sample: ReactionProcessAction::ActionSaveSample.new(
              sample: OrdKit::Exporter::Compounds::SaveCompoundExporter.new(action).to_ord,
            ),
          }
        end
      end
    end
  end
end
