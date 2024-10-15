# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Custom < Base
          def addition_speed_types
            titlecase_options_for(OrdKit::ReactionInput::AdditionSpeed::AdditionSpeedType.constants)
          end

          def automation_modes
            [{ value: 'MANUAL', label: 'Manual' },
             { value: 'AUTOMATED', label: 'Automated' }]
          end
        end
      end
    end
  end
end
