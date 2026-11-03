# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module Constants
      class Conditions
        GLOBAL_DEFAULTS = {
          TEMPERATURE: { value: '21', unit: 'CELSIUS' },
          PRESSURE: { value: '1013', unit: 'MBAR' },
          PH: { value: 7, unit: 'PH' },
          IRRADIATION: {},
          MOTION: {},
          EQUIPMENT: {},
          automation_mode: Constants::Ontologies::DEFAULT_AUTOMATION_MODE,
        }.deep_stringify_keys
      end
    end
  end
end
