# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification < Base
          def select_options_for(reaction_process:)
            {
              CENTRIFUGATION: SelectOptions::Forms::Purification::Centrifugation.new.select_options,
              CHROMATOGRAPHY: SelectOptions::Forms::Purification::Chromatography.new.select_options,
              CRYSTALLIZATION: SelectOptions::Forms::Purification::Crystallization.new.select_options,
              EXTRACTION: SelectOptions::Forms::Purification::Extraction
                .new.select_options_for(reaction_process: reaction_process),
              FILTRATION: SelectOptions::Forms::Purification::Filtration
                .new.select_options_for(reaction_process: reaction_process),
            }
          end
        end
      end
    end
  end
end
