# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis
          class Spectroscopy < Base
            def select_options
              { spectroscopy_types: spectroscopy_types_options }
            end

            private

            def spectroscopy_types_options
              [{ value: 'NMR', label: 'NMR' },
               { value: 'UV_VIS', label: 'UV-VIS' },
               { value: 'IR', label: 'IR' }]
            end
          end
        end
      end
    end
  end
end
