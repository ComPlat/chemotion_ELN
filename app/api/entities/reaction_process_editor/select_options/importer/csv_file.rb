# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Importer
        class CsvFile
          ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp/reaction-process-editor')

          FILENAMES = {
            devices: 'ChemASAP-Devices.csv',
          }.freeze

          def read(type)
            CSV.parse(
              csv_file(type),
              col_sep: ';',
              headers: true,
              return_headers: false,
              converters: [->(string) { string&.strip }],
            )
          end

          private

          def csv_file(type)
            @csv_file ||= Rails.root.join(ROOT_DIR, FILENAMES[type]).read
          rescue Errno::ENOENT
            ''
          end
        end
      end
    end
  end
end
