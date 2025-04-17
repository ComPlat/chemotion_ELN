# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class PoolingGroups < Base
          def select_options
            activities_list = %w[EVAPORATION DISCARD ADD FILTRATION EXTRACTION CHROMATOGRAPHY
                                 CRYSTALLIZATION ANALYSIS_CHROMATOGRAPHY ANALYSIS_SPECTROSCOPY REMOVE SAVE]
            { followup_action_types: titlecase_options_for(activities_list) }
          end
        end
      end
    end
  end
end
