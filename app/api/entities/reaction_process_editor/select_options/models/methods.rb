# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Methods < Base
          DEVICENAME_PREFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICENAME_PREFIX', '')
          METHODNAME_SUFFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICE_METHODS_SUFFIX', '')

          REGEX_NAMES_AND_BRACKET_VALUES = /(.*?) \((.*?)\),*/.freeze

          def to_options(methods_csv)
            methods_csv.map { |method_csv| method_options(method_csv) }
          end

          private

          def method_options(method_csv)
            {
              label: method_label(method_csv),
              value: method_label(method_csv),
              detectors: SelectOptions::Models::MethodDetectors.instance.to_options(method_csv['Detectors']),
              mobile_phases: mobile_phases_options(method_csv['Mobile Phase']),
              stationary_phases: [stationary_phase_option(method_csv['Stationary Phase'])],
              default_volume: { value: method_csv['Def. Inj. Vol.'], unit: 'ml' },
              description: method_csv['Description'],
              steps: steps(method_csv),
            }
          end

          def steps(method_csv)
            method_csv['Steps'] ? JSON.parse(method_csv['Steps']) : []
          rescue JSON::ParserError
            []
          end

          def mobile_phases_options(mobile_phases)
            mobile_phases.scan(REGEX_NAMES_AND_BRACKET_VALUES).map do |phase_match|
              options_for(phase_match[0])
            end.flatten
          end

          def stationary_phase_option(phase)
            phase_data = phase.match(REGEX_NAMES_AND_BRACKET_VALUES)

            label = phase_data[1].strip
            analysis_default_value = phase_data[2]

            option = { label: label, value: label }
            return option if analysis_default_value.blank?

            option.merge(stationary_phase_analysis_defaults(analysis_default_value))
          end

          def stationary_phase_analysis_defaults(value)
            { analysis_defaults: {
              TEMPERATURE: {
                value: value,
                unit: 'CELSIUS',
              },
            } }
          end

          def method_label(method_csv)
            method_csv['Method Name']
              .delete_prefix(DEVICENAME_PREFIX)
              .delete_prefix(method_csv['Device Name'])
              .delete_prefix('_')
              .delete_suffix(METHODNAME_SUFFIX)
              .strip
          end
        end
      end
    end
  end
end
