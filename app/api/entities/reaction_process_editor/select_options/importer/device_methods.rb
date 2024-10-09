# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Importer
        class DeviceMethods
          ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', nil)
          DEVICES_FILES = 'devices/*.csv'
          DEVICES_FILENAME_PREFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICENAME_PREFIX', '')

          def all
            all_with_device_name
          end

          private

          def all_with_device_name
            @all_with_device_name ||= device_methods_files.map { |filename| read_csv_with_device_name(filename) }
          end

          def read_csv_with_device_name(filename)
            read_csv(filename).map { |csv| csv << { 'Device Name': parse_device_name(filename) }.stringify_keys }
          end

          def parse_device_name(filename)
            File.basename(filename, '.csv').delete_prefix(DEVICES_FILENAME_PREFIX)
          end

          def read_csv(filename)
            CSV.parse(filename.read, col_sep: ';', headers: true, return_headers: false)
          end

          def device_methods_files
            Rails.root.glob("#{ROOT_DIR}/#{DEVICES_FILES}")
          end
        end
      end
    end
  end
end
