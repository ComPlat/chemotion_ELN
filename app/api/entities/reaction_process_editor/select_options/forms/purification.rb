# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification < Base
          def select_options_for(reaction_process:)
            {
              CHROMATOGRAPHY: SelectOptions::Forms::Purification::Chromatography
                .instance.select_options,
              CRYSTALLIZATION: SelectOptions::Forms::Purification::Crystallization
                .instance.select_options,
              EXTRACTION: SelectOptions::Forms::Purification::Extraction
                .instance.select_options_for(reaction_process: reaction_process),
              FILTRATION: SelectOptions::Forms::Purification::Filtration
                .instance.select_options_for(reaction_process: reaction_process),
            }
          end
        end
      end
    end
  end
end
