# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Motion < Base
          def select_options
            {
              automation_modes: SelectOptions::Models::Custom.instance.automation_modes,
              types: motion_types,
            }
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
