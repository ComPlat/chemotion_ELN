# frozen_string_literal: true

require 'roo'

module Usecases
  module ResearchPlans
    class ImportTableFromSpreadsheet
      def initialize(research_plan, attachment)
        @research_plan = research_plan
        @attachment = attachment
        @file_path = @attachment.store.path

        @rows = []
        @error_messages = []
      end

      def execute!
        begin
          read_file
        rescue Zip::Error
          @error_messages << "Can not process this type of file, must be '.xlsx'."
          raise StandardError, @error_messages.join("\n")
        end

        begin
          import_data
        rescue StandardError
          raise StandardError, @error_messages.join("\n")
        end
      end

      private

      def read_file
        xlsx = Roo::Spreadsheet.open(@file_path, extension: :xlsx)
        sheet = xlsx.sheet(0)
        @headers = sheet.row(1).map(&:to_s).map(&:strip).map { |header| column_definition(header) }
        @rows = sheet.parse.map { |row| row_definition(row) }
      end

      def import_data
        @research_plan.body << table_headline
        @research_plan.body << {
          id: SecureRandom.uuid,
          type: :table,
          title: @attachment.filename,
          value: {
            rows: @rows.map(&:stringify_keys),
            columns: @headers.map(&:stringify_keys)
          }
        }
        @research_plan.save!
      end

      def table_headline
        uuid = Digest::UUID.uuid_v4()
        {
          id: uuid,
          type: :richtext,
          title: 'Text',
          value: {
            ops: [
              { insert: @attachment.filename },
              { insert: "\n", attributes: { header: 3 } }
            ]
          }
        }
      end

      def column_definition(column_name)
        # NOTES:
        # colId could be omitted according to the AgGrid API, but ResearchPlanDetailsFieldTable uses it to hardcode a key
        # field defines which row field is used to fetch the data
        #
        # see https://www.ag-grid.com/javascript-data-grid/column-properties/ for more information
        {
          colId: column_name,
          field: column_name,
          headerName: column_name,
          editable: true,
          resizable: true
        }
      end

      def row_definition(row_data)
        row = {}
        row_data.each_with_index do |entry, index|
          field_name = @headers[index][:field]
          row[field_name] = entry
        end
        row
      end
    end
  end
end
