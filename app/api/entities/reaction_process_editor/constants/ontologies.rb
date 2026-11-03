# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module Constants
      class Ontologies
        ACTION_ONTOLOGIES =	{
          CHROMATOGRAPHY: { action: 'CHMO:0002231', class: 'CHMO:0001000' },
          ANALYSIS_CHROMATOGRAPHY: { action: 'OBI:0000070', class: 'CHMO:0001000' },
          ANALYSIS_SPECTROSCOPY: { action: 'OBI:0000070', class: 'CHMO:0000228' },
        }.deep_stringify_keys.freeze

        AUTOMATION_MANUAL_MODES = ['NCIT:C63513'].freeze
        AUTOMATION_AUTOMATED_MODES = ['NCIT:C172484', 'NCIT:C70669'].freeze

        DEFAULT_AUTOMATION_MODE = 'NCIT:C70669'

        def self.motion_modes
          [{ value: 'NCIT:C63513', label: 'Manual' },
           { value: 'NCIT:C70669', label: 'Automated' }]
        end

        def self.automation_mode_manual?(ontology_id)
          AUTOMATION_MANUAL_MODES.include?(ontology_id)
        end

        def self.automation_mode_automated?(ontology_id)
          AUTOMATION_AUTOMATED_MODES.include?(ontology_id)
        end

        def self.action_ontology_workup(action_name)
          ACTION_ONTOLOGIES[action_name] || {}
        end
      end
    end
  end
end
