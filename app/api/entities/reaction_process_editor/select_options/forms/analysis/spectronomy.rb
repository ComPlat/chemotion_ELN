# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis
          class Spectronomy < Base
            def select_options
              { spectronomy_types: spectronomy_types_options }
            end

            private

            def spectronomy_types_options
              [{ value: 'MASS_SPEC', label: 'Mass Spec' }]
            end
          end
        end
      end
    end
  end
end
