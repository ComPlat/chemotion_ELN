# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Motion < Base
          def select_options
            {
              automation_modes: SelectOptions::Models::Custom.instance.automation_modes,
              types: SelectOptions::Models::Custom.instance.motion_types,
            }
          end
        end
      end
    end
  end
end
