require 'json'
require 'rubyXL'

# Belongs to Chemotion module
module Chemotion
  # Convert XLSX first 2 columns into a JSON object
  module XlsxToJson
    def self.get_xlsx_column(worksheet, column_no)
      worksheet.collect { |row| row && row[column_no] && row[column_no].value }
    end

    def self.xlsx_to_json(xlsx_path, json_path)
      workbook = RubyXL::Parser.parse(xlsx_path)
      first_col = get_xlsx_column(workbook.worksheets[0], 0)
      sec_col = get_xlsx_column(workbook.worksheets[0], 1)
      num = [first_col.count, sec_col.count].min(1).first
      hash = {}
      (1...num + 1).each do |i| hash[sec_col[i]] = first_col[i] end
      File.open(json_path, 'w') { |file| file.write(hash.to_json) }
    end
  end
end
