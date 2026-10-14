# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class PoolingGroups < Base
          AVAILABLE_ACTIVITIES = %w[DEFINE_FRACTION DISCARD FILTRATION EXTRACTION CHROMATOGRAPHY
                                    CRYSTALLIZATION CENTRIFUGATION ANALYSIS_CHROMATOGRAPHY ANALYSIS_SPECTROSCOPY].freeze

          def select_options
            { consuming_action_names: titlecase_options_for(AVAILABLE_ACTIVITIES).push(
              { value: 'REMOVE', label: 'Remove (Solvent From Fraction)' },
              { value: 'SAVE', label: 'Save Intermediate' },
            ) }
          end
        end
      end
    end
  end
end
