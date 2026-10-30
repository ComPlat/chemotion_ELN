# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        module Purification
          class Chromatography < Base
            def select_options
              {
                step_modes: step_modes,
                prod_modes: prod_modes,
                equipment: equipment_options,
              }
            end

            private

            def equipment_options
              titlecase_options_for(%w[FILTER SEPARATION_FILTER EXTRACTOR SPE_COLUMN FSPE_COLUMN
                                       FLASH_COLUMN DISTILLATION_APPARATUS SEPARATION_FUNNEL BUCHNER_FUNNEL])
            end

            def step_modes
              titlecase_options_for(%w[EQUILIBRIUM SEPARATION AFTER_RUN])
            end

            def prod_modes
              [{ value: 'ANY', label: 'Any' },
               { value: 'PROD', label: 'Prod' },
               { value: 'NONE', label: 'No' }]
            end
          end
        end
      end
    end
  end
end
