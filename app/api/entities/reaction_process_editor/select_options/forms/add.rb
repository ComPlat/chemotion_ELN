# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Add < Base
          def select_options
            {
              addition_speed_types: titlecase_options_for(Clap::ReactionProcessAction::ActionAdd::AdditionSpeedType.constants),
              equipment: SelectOptions::Models::Equipment.new.all,
            }
          end
        end
      end
    end
  end
end
