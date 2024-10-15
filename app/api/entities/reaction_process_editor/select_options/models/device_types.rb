# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class DeviceTypes < Base
          def select_options(process_type:, category:)
            process_type_options(devices_csv).dig(process_type, category) || []
          end

          private

          def process_type_options(devices)
            aggregate_devices_by_key(devices: devices, key: 'Process Type')
              .transform_values { |device| category_options(device) }
          end

          def category_options(devices)
            aggregate_devices_by_key(devices: devices, key: 'Category')
              .transform_values { |device| device_types_options(device) }
          end

          def device_types_options(devices)
            aggregate_devices_by_key(devices: devices, key: 'Type')
              .map do |type_name, type_devices|
              {
                label: type_name,
                value: type_name,
                subtypes: subtype_options(type_devices),
              }
            end
          end

          def subtype_options(devices)
            aggregate_devices_by_key(devices: devices, key: 'Sub-Type')
              .map do |subtype_name, subtype_devices|
              {
                label: subtype_name,
                value: subtype_name,
                devices: Models::Devices.instance.select_options_for(devices_csv: subtype_devices),
              }
            end
          end

          def aggregate_devices_by_key(devices:, key:)
            devices
              .pluck(key)
              .uniq
              .index_with do |aggregate_key|
              devices.select { |device_csv| device_csv[key] == aggregate_key }
            end
          end

          def devices_csv
            SelectOptions::Importer::Devices.new.devices_csv
          end
        end
      end
    end
  end
end
