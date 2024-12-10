# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Detectors < Base
          DETECTOR_TYPES = { PDA: ['CHMO:0001728', 'WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                             ELSD: %w[CHMO:0002866 METRIC TEMPERATURE CELSIUS Temperature],
                             MS: %w[CHMO:0002337 TEXT MS_PARAMETER V Parameter],
                             FID: %w[CHMO:0001719],
                             BID: %w[CHMO:0001724] }.stringify_keys

          def select_options_for(detector_ids)
            detector_ids.map do |detector_id|
              label, detector_type = DETECTOR_TYPES.find { |_det_type, metrics| metrics[0] == detector_id }

              { value: detector_id,
                label: label || detector_id,
                analysis_defaults: detector_analysis_defaults(detector_type) }
            end
          end

          private

          def detector_analysis_defaults(detector_type)
            _chmo_id, data_type, metric, _unit, label = detector_type

            return [] unless data_type

            # TODO: A detector might have multiple metrics /metric_names (therefore we return an array).
            # Current files have only one. Adapt CSV parsing once File format has been defined. cbuggle, 14.10.2024.
            [{
              label: label,
              data_type: data_type,
              metric_name: metric,
            }]
          end
        end
      end
    end
  end
end
