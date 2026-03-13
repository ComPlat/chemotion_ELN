# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Motion < Base
          def select_options
            {
              motion_modes: SelectOptions::Models::Custom.new.motion_modes,
              types: motion_types,
            }
          end

          def motion_modes
            [{ value: 'NCIT:C63513', label: 'Manual' },
             { value: 'NCIT:C70669', label: 'Automated' }]
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
