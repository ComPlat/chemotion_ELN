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
            detector_type = detector_csv[0].strip
            analysis_default_values = detector_csv[1]

            options = { label: detector_type, value: detector_type }
            return options if analysis_default_values.blank?

            options.merge(analysis_defaults: detector_analysis_defaults(detector_type,
                                                                        analysis_default_values))
          end

          def detector_analysis_defaults(detector_type, values)
            input_type, analysis_type, unit, label = DETECTOR_ANALYSIS_TYPES[detector_type]

            return {} unless analysis_type

            { detector: detector_type,
              input_type: input_type,
              analysis_type: analysis_type,
              label: label || analysis_type.titlecase,
              values: analysis_default_values(input_type: input_type, values: values, unit: unit) }
          end

          def analysis_default_values(input_type:, values:, unit:)
            case input_type
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
