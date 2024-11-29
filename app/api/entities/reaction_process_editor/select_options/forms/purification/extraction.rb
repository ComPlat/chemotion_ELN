# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification
          class Extraction < Base
            def select_options_for(reaction_process:)
              {
                automation_modes: SelectOptions::Models::Custom.new.automation_modes,
                phases: extraction_phases,
                solvents: solvent_options_for(reaction_process: reaction_process),
              }
            end

            private

            def extraction_phases
              [{ value: 'AQUEOUS', label: 'Aqueous' },
               { value: 'ORGANIC', label: 'Organic' }]
            end
          end
        end
      end
    end
  end
end
