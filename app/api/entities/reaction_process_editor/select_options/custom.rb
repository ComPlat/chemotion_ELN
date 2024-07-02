# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Custom < Base
        def self.addition_speed_types
          titlecase_options_for(OrdKit::ReactionInput::AdditionSpeed::AdditionSpeedType.constants)
        end

        def self.automation_modes
          [{ value: 'MANUAL', label: 'Manual' },
           { value: 'AUTOMATED', label: 'Automated' }]
        end

        def self.motion_types
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

        def self.analysis_types
          [{ value: 'TLC', label: 'Thin Layer Chromatography (TLC)' },
           { value: 'GC', label: 'Gas Chromatography (GC)' },
           { value: 'HPLC', label: 'High Performance Liquid Chromatography (HPLC)' },
           { value: 'GCMS', label: 'Combined GC/MS (GC/MS)' },
           { value: 'LCMS', label: 'Combined LC/MS (LCMS)' }]
        end
      end
    end
  end
end
