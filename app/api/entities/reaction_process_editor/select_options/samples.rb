# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Samples < Base
        def remove_sample_types
          [{ value: 'MEDIUM', label: 'Medium' },
           { value: 'ADDITIVE', label: 'Solvent (Evaporate)' },
           { value: 'DIVERSE_SOLVENT', label: 'Diverse Solvent' }]
        end

        def save_sample_origin_types
          [{ value: 'ALL', label: 'All' },
           { value: 'SPLIT', label: 'Split' },
           { value: 'PURIFICATION', label: 'Purification' }]
        end

        def save_sample_types
          [{ value: 'PURE', label: 'Pure' },
           { value: 'CRUDE', label: 'Crude' },
           { value: 'MIXTURE', label: 'Mixture' },
           { value: 'INTERMEDIATE', label: 'Intermediate' }]
        end

        def preparation_types
          [
            { value: 'DISSOLVED', label: 'Dissolved' },
            { value: 'HOMOGENIZED', label: 'Homogenized' },
            { value: 'TEMPERATURE_ADJUSTED', label: 'Temperature Adjusted' },
            { value: 'DEGASSED', label: 'Degassed' },
            { value: 'DRIED', label: 'Drying' },
          ]
        end
      end
    end
  end
end
