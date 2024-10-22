# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Importer
        class Devices
          ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', nil)
          DEVICES_FILENAME = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICES_FILENAME', '')

          def devices_csv
            CSV.parse(devices_file, col_sep: ';', headers: true, return_headers: false)
          end

          private

          def devices_file
            @devices_file ||= Rails.root.join(ROOT_DIR, DEVICES_FILENAME).read
          rescue Errno::ENOENT
            ''
          end
        end
      end
    end
  end
end
