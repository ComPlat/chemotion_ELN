# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        module Purification
          class Filtration < Base
            def select_options_for(reaction_process:)
              {
                modes: filtration_modes,
                solvents: solvent_options_for(reaction_process: reaction_process),
              }
            end

            private

            def filtration_modes
              [{ value: 'KEEP_SUPERNATANT', label: 'Supernatant' },
               { value: 'KEEP_PRECIPITATE', label: 'Precipitate' }]
            end
          end
        end
      end
    end
  end
end
