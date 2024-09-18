# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Measurement < Base
        def select_options
          {
            # SelectOptions::Chromatography is mostly tailored to Purify but reusable
            CHROMATOGRAPHY: SelectOptions::Chromatography.instance.select_options,
            SPECTRONOMY: { spectronomy_types: spectronomy_types_options },
            SPECTROSCOPY: { spectroscopy_types: spectroscopy_types_options },
          }
        end

        private

        def spectronomy_types_options
          [{ value: 'MASS_SPEC', label: 'Mass Spec' }]
        end

        def spectroscopy_types_options
          [{ value: 'NMR', label: 'NMR' },
           { value: 'UV_VIS', label: 'UV-VIS' },
           { value: 'IR', label: 'IR' }]
        end
      end
    end
  end
end
