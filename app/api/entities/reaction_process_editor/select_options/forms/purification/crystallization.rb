# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification
          class Crystallization < Base
            def select_options
              {
                modes: crystallization_modes,
                automation_modes: SelectOptions::Models::Custom.new.automation_modes,
                solvents: crystallization_solvent_options,
              }
            end

            private

            def crystallization_modes
              titlecase_options_for(%w[NONE HOT COLD])
            end

            def crystallization_solvent_options
              sample_minimal_options(Medium::Additive.all, 'ADDITIVE')
            end
          end
        end
      end
    end
  end
end
