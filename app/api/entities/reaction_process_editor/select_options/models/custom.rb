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

          def motion_types
            [{ value: 'UNSPECIFIED', label: 'Motion Unspecified' },
             { value: 'CUSTOM', label: 'Motion Custom' },
             { value: 'NONE', label: 'Motion None' },
             { value: 'STIR_BAR', label: 'Stir' },
             { value: 'OVERHEAD_MIXER', label: 'Overhead Mixer' },
             { value: 'AGITATION', label: 'Shake' },
             { value: 'BALL_MILLING', label: 'Ball Milling' },
             { value: 'SONICATION', label: 'Sonication' },
             { value: 'OTHER', label: 'Motion' }]
          end
        end
      end
    end
  end
end
