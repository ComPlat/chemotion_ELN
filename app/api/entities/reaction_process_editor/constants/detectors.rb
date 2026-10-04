# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module Constants
      class Detectors
        DETECTOR_SETTINGS = {
          'CHMO:0001728': {
            value: 'CHMO:0001728',
            label: 'PDA',
            analysis_defaults: [{
              label: 'Wavelengths (nm)',
              data_type: 'WAVELENGTHRANGE',
              metric_name: 'WAVELENGTHS',
            }],
          },

          'CHMO:0002866': {
            value: 'CHMO:0002866',
            label: 'ELSD',
            analysis_defaults: [{
              label: 'Temperature',
              data_type: 'METRIC',
              metric_name: 'TEMPERATURE',
            }],
          },

          'CHMO:0002337': {
            value: 'CHMO:0002337',
            label: 'MS',
            analysis_defaults: [{
              label: 'Parameter',
              data_type: 'TEXT',
              metric_name: 'MS_PARAMETER',
            }],
          },

          'CHMO:0001724': {
            value: 'CHMO:0001724',
            label: 'BID',
            analysis_defaults: [],
          },

          'CHMO:0001719': {
            value: 'CHMO:0002337',
            label: 'FID',
            analysis_defaults: [],
          },
        }.deep_stringify_keys.freeze

        def self.detector_settings(detector_id)
          DETECTOR_SETTINGS[detector_id] ||
            { value: detector_id,
              label: detector_id, analysis_defaults: [{ label: 'none' }] }
        end
      end
    end
  end
end
