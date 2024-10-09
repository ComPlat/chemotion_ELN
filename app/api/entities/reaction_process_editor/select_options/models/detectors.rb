# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Detectors < Base
          DETECTOR_ANALYSIS_TYPES = { PDA: %w[WAVELENGTHS NM],
                                      ELSD: %w[TEMPERATURE CELSIUS],
                                      MS: %w[MS_PARAMETER V] }.stringify_keys

          ANALYSIS_TYPES_WITH_SINGLE_VALUE = %w[TEMPERATURE].freeze
          ANALYSIS_TYPES_WITH_TEXT = %w[MS_PARAMETER].freeze

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
            analysis_type, unit = DETECTOR_ANALYSIS_TYPES[detector_type]

            { "#{analysis_type}": analysis_default_values(analysis_type: analysis_type, values: values, unit: unit) }
          end

          def analysis_default_values(analysis_type:, values:, unit:)
            return "#{values} #{unit}" if ANALYSIS_TYPES_WITH_TEXT.include?(analysis_type)

            return { value: values, unit: unit } if ANALYSIS_TYPES_WITH_SINGLE_VALUE.include?(analysis_type)

            { peaks: split_values(values: values, unit: unit) }
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
