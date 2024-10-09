# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Add < Base
          def select_options
            {
              addition_speed_types: SelectOptions::Models::Custom.instance.addition_speed_types,
              equipment: SelectOptions::Models::Equipment.instance.all,
            }
          end
        end
      end
    end
  end
end
