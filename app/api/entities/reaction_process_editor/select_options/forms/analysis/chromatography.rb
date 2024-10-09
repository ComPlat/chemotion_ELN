# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis
          class Chromatography < SelectOptions::Forms::Purification::Chromatography
            private

            def automation_mode_options
              [{ value: 'SEMI_AUTOMATED', label: 'Semi-Automated' },
               { value: 'AUTOMATED', label: 'Automated' }]
            end

            def chromatography_type_options
              SelectOptions::Models::DeviceTypes.instance.select_options(process_type: 'Analysis',
                                                                         category: 'Chromatography')
            end
          end
        end
      end
    end
  end
end
