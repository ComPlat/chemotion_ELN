# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Purify < Base
        def select_options_for(reaction_process)
          { CRYSTALLIZATION: {
              modes: crystallization_modes,
              automation_modes: SelectOptions::Custom.instance.automation_modes,
              solvent_options: material_options(reaction_process)['CRYSTALLIZATION'],
            },
            EXTRACTION: {
              automation_modes: SelectOptions::Custom.instance.automation_modes,
              phases: extraction_phases,
              solvent_options: material_options(reaction_process)['EXTRACTION'],
            },
            FILTRATION: {
              automation_modes: SelectOptions::Custom.instance.automation_modes,
              modes: filtration_modes,
              solvent_options: material_options(reaction_process)['FILTRATION'],
            },
            CHROMATOGRAPHY: SelectOptions::Chromatography.instance.select_options }
        end

        def material_options(reaction_process)
          {
            CRYSTALLIZATION: crystallization_options,
            EXTRACTION: solvent_options(reaction_process),
            FILTRATION: solvent_options(reaction_process),
          }.deep_stringify_keys
        end

        def crystallization_modes
          [{ value: 'NONE', label: 'None' },
           { value: 'COLD', label: 'Cold' },
           { value: 'HOT', label: 'Hot' }]
        end

        def extraction_phases
          [{ value: 'AQUEOUS', label: 'Aqueous' },
           { value: 'ORGANIC', label: 'Organic' }]
        end

        def filtration_modes
          [{ value: 'KEEP_SUPERNATANT', label: 'Supernatant' },
           { value: 'KEEP_PRECIPITATE', label: 'Precipitate' }]
        end

        private

        def solvent_options(reaction_process)
          reaction = reaction_process.reaction

          solvents = (reaction.solvents + reaction.purification_solvents).uniq

          sample_minimal_options(solvents,
                                 'SOLVENT') + sample_minimal_options(Medium::DiverseSolvent.all, 'DIVERSE_SOLVENT')
        end

        def crystallization_options
          sample_minimal_options(Medium::Additive.all, 'ADDITIVE')
        end
      end
    end
  end
end
