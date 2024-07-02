# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Purify < Base
        def self.select_options(reaction_process)
          { CRYSTALLIZATION: {
              modes: crystallization_modes,
              automation_modes: SelectOptions::Custom.automation_modes,
              solvent_options: material_options(reaction_process)['CRYSTALLIZATION'],
            },
            EXTRACTION: {
              automation_modes: SelectOptions::Custom.automation_modes,
              phases: extraction_phases,
              solvent_options: material_options(reaction_process)['EXTRACTION'],
            },
            FILTRATION: {
              automation_modes: SelectOptions::Custom.automation_modes,
              modes: filtration_modes,
              solvent_options: material_options(reaction_process)['FILTRATION'],
            },
            CHROMATOGRAPHY: SelectOptions::Chromatography.select_options.merge(
              automation_modes: SelectOptions::Chromatography.automation_modes,
              solvent_options: material_options(reaction_process)['CHROMATOGRAPHY'],
            ) }
        end

        def self.material_options(reaction_process)
          reaction = reaction_process.reaction

          solvents = (reaction.solvents + reaction.purification_solvents).uniq
          diverse_solvents = Medium::DiverseSolvent.all

          solvent_options = sample_purify_options(solvents,
                                                  'SOLVENT') + sample_purify_options(diverse_solvents,
                                                                                     'DIVERSE_SOLVENT')
          chromatography_options = sample_purify_options(Medium::Modifier.all, 'MODIFIER') +
                                   sample_purify_options(diverse_solvents, 'DIVERSE_SOLVENT')

          {
            CRYSTALLIZATION: sample_purify_options(Medium::Additive.all, 'ADDITIVE'),
            CHROMATOGRAPHY: chromatography_options,
            EXTRACTION: solvent_options,
            FILTRATION: solvent_options,
          }.deep_stringify_keys
        end

        def self.crystallization_modes
          [{ value: 'NONE', label: 'None' },
           { value: 'COLD', label: 'Cold' },
           { value: 'HOT', label: 'Hot' }]
        end

        def self.extraction_phases
          [{ value: 'AQUEOUS', label: 'Aqueous' },
           { value: 'ORGANIC', label: 'Organic' }]
        end

        def self.filtration_modes
          [{ value: 'KEEP_SUPERNATANT', label: 'Supernatant' },
           { value: 'KEEP_PRECIPITATE', label: 'Precipitate' }]
        end
      end
    end
  end
end
