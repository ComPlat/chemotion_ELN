# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class MethodDetectors < Base
          DETECTOR_ANALYSIS_TYPES = { PDA: ['WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                                      ELSD: %w[METRIC TEMPERATURE CELSIUS],
                                      MS: ['TEXT', 'MS_PARAMETER', 'V', 'MS Parameter'] }.stringify_keys

          REGEX_NAMES_AND_BRACKET_VALUES = /(.*?) \((.*?)\),*/.freeze

          def to_options(detectors_csv)
            detectors_data = detectors_csv.scan(REGEX_NAMES_AND_BRACKET_VALUES)
            detectors_data.map { |detector_csv| detector_options(detector_csv) }
          end

          private

          def detector_options(detector_csv)
            detector_name = detector_csv[0].strip
            analysis_default_values = detector_csv[1]

            options = { label: detector_name, value: detector_name }
            return options if analysis_default_values.blank?

            options.merge(analysis_defaults: detector_analysis_defaults(detector_name,
                                                                        analysis_default_values))
          end

          def detector_analysis_defaults(detector_name, values)
            data_type, metric_name, unit, label = SelectOptions::Models::Devices::DETECTOR_ANALYSIS_TYPES[detector_name]

            return [] unless data_type

            # TODO: A detector might have multiple metrics /metric_names (therefore we return an array).
            # Current files have only one. Adapt CSV parsing once File format has been defined. cbuggle, 14.10.2024.
            [{
              label: label || metric_name&.titlecase,
              data_type: data_type,
              metric_name: metric_name,
              values: analysis_default_values(data_type: data_type, values: values, unit: unit),
            }]
          end

          def analysis_default_values(data_type:, values:, unit:)
            case data_type
            when 'TEXT'
              "#{values} #{unit}"
            when 'METRIC'
              { value: values, unit: unit }
            when 'WAVELENGTHLIST'
              { peaks: split_values(values: values, unit: unit) }
            end
          end

          def split_values(values:, unit:)
            values.split(',').map do |value|
              { value: value, unit: unit }
            end
          end
        end
      end
    end
  end
end
