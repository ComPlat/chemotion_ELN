# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class PoolingGroups < Base
          def select_options
            activities_list = %w[DEFINE_FRACTION DISCARD FILTRATION EXTRACTION CHROMATOGRAPHY
                                 CRYSTALLIZATION CENTRIFUGATION ANALYSIS_CHROMATOGRAPHY ANALYSIS_SPECTROSCOPY]
            { consuming_activity_names: titlecase_options_for(activities_list).push(
              { value: 'REMOVE', label: 'Remove (Solvent From Fraction)' },
              { value: 'SAVE', label: 'Save Intermediate' },
            ) }
          end
        end
      end
    end
  end
end
