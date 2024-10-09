# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Transfer < Base
          def select_options
            {
              equipment: SelectOptions::Models::Equipment.instance.all,
            }
          end
        end
      end
    end
  end
end
