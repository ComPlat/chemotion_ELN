# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Detectors < Base
          def select_options_for(detector_ids)
            detector_ids.map do |detector_id|
              Constants::Detectors.detector_settings(detector_id)
            end
          end
        end
      end
    end
  end
end
