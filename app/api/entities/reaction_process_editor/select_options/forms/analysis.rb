# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis < Base
          def select_options
            {
              CHROMATOGRAPHY: SelectOptions::Forms::Analysis::Chromatography.instance.select_options,
              SPECTRONOMY: SelectOptions::Forms::Analysis::Spectronomy.instance.select_options,
              SPECTROSCOPY: SelectOptions::Forms::Analysis::Spectroscopy.instance.select_options,
            }
          end
        end
      end
    end
  end
end
