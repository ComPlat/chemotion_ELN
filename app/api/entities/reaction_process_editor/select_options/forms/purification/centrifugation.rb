# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Purification
          class Centrifugation < Base
            def select_options
              { automation_modes: SelectOptions::Models::Custom.new.automation_modes }
            end
          end
        end
      end
    end
  end
end
