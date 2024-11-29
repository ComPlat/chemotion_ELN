# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis < Base
          def select_options
            {
              CHROMATOGRAPHY: SelectOptions::Forms::Analysis::Chromatography.new.select_options,
              SPECTROMETRY: SelectOptions::Forms::Analysis::Spectrometry.new.select_options,
              SPECTROSCOPY: SelectOptions::Forms::Analysis::Spectroscopy.new.select_options,
            }
          end
        end
      end
    end
  end
end
