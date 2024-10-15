# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification
          class Chromatography < Base
            def select_options
              {
                automation_modes: automation_mode_options,
                chromatography_types: chromatography_type_options,
                step_modes: step_modes,
                prod_modes: prod_modes,
                jar_materials: jar_material_options,
                solvents: solvent_options,
                equipment: equipment_options,
              }
            end

            private

            def automation_mode_options
              [{ value: 'MANUAL', label: 'Manual' },
               { value: 'SEMI_AUTOMATED', label: 'Semi-Automated' },
               { value: 'AUTOMATED', label: 'Automated' }]
            end

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

            def jar_material_options
              titlecase_options_for(%w[GLASS METAL])
            end

            def solvent_options
              sample_minimal_options(Medium::Modifier.all,
                                     'MODIFIER') + sample_minimal_options(Medium::DiverseSolvent.all, 'DIVERSE_SOLVENT')
            end

            def chromatography_type_options
              SelectOptions::Models::DeviceTypes.instance.select_options(process_type: 'Purification',
                                                                         category: 'Chromatography')
            end
          end
        end
      end
    end
  end
end
