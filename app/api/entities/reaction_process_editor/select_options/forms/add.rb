# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Add < Base
          def select_options
            {
              addition_speed_types: SelectOptions::Models::Custom.new.addition_speed_types,
              equipment: SelectOptions::Models::Equipment.new.all,
            }
          end
        end
      end
    end
  end
end
