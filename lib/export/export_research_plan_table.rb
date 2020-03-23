require 'tempfile'

module Export
  class ExportResearchPlanTable

    def initialize
      @xfile = Axlsx::Package.new
      @file_extension = 'xlsx'
      @xfile.workbook.styles.fonts.first.name = 'Calibri'
    end

    def generate_sheet(columns, rows)
      @xfile.workbook.add_worksheet(:name => "Pie Chart") do |sheet|
        sheet.add_row columns.map {|column| column['name']}

        rows.each do |row|
          sheet.add_row columns.map {|column| row[column['key']]}
        end
      end
    end

    def read
      @xfile.to_stream.read
    end
  end
end
