# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Samples < Base
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
end
