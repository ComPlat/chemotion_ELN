# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class DeviceMethods < Base
          def select_options_for(device_name:)
            matching_device = devices_methods_options.find { |device| device[:value].upcase == device_name.upcase }
            matching_device ? matching_device[:methods] : []
          end

          private

          def devices_methods_options
            @devices_methods_options = devices_methods_csv.map do |device_methods_csv|
              device_name = device_methods_csv[0]['Device Name']

              { label: device_name,
                value: device_name,
                methods: SelectOptions::Models::Methods.instance.to_options(device_methods_csv) }
            end
          end

          def devices_methods_csv
            SelectOptions::Importer::DeviceMethods.new.all
          end
        end
      end
    end
  end
end
