# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Detectors < Base
          DETECTOR_ANALYSIS_TYPES = { PDA: ['WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                                      ELSD: %w[METRIC TEMPERATURE CELSIUS],
                                      MS: %w[TEXT MS_PARAMETER V Parameter] }.stringify_keys

          def select_options_for(detector_name:)
            detector_options(detector_name)
          end

          private

          def detector_options(detector_name)
            data_type, metric_name, unit, label = DETECTOR_ANALYSIS_TYPES[detector_name]

            return option_for(detector_name) unless metric_name

            option_for(detector_name).merge(
              analysis_types: [{
                data_type: data_type,
                metric_name: metric_name,
                label: label || metric_name.titlecase,
                unit: unit,
              }],
            )
          end
        end
      end
    end
  end
end
