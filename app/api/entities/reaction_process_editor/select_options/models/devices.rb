# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Devices < Base
          DETECTOR_ANALYSIS_TYPES = { PDA: ['WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                                      ELSD: %w[METRIC TEMPERATURE CELSIUS],
                                      MS: %w[TEXT MS_PARAMETER V Parameter] }.stringify_keys

          DEVICENAME_PREFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICENAME_PREFIX', '')

          def select_options_for(devices_csv:)
            devices_options(devices_csv)
          end

          private

          def devices_options(devices_csv)
            devices_csv.map do |device_csv|
              device_name = device_csv['Device Name']
                            .delete_prefix(DEVICENAME_PREFIX)
                            .delete('/')

              device_methods = Models::DeviceMethods.instance.select_options_for(device_name: device_name)

              { label: device_name,
                value: device_name,
                detectors: device_detector_options(device_csv),
                methods: device_methods,
                mobile_phases: mobile_phases_options(device_csv),
                stationary_phases: collect_stationary_phases(device_methods) }
            end
          end

          def options_for_column(column_name)
            options_for(device_csv[column_name].split(', '))
          end

          def mobile_phases_options(device_csv)
            options_for(device_csv['Mobile Phases / Solvents / Gases'].split(', '))
          end

          def collect_stationary_phases(devices_csv)
            devices_csv.pluck(:stationary_phases).flatten.uniq { |phase| phase['value'] }
          end

          def device_detector_options(device)
            device['Detectors']&.split(', ')&.map do |detector_name|
              SelectOptions::Models::Detectors.instance.select_options_for(detector_name: detector_name)
            end
          end
        end
      end
    end
  end
end
