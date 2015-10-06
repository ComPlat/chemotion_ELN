require ''

class Report::ExcelReport < Report::Report
  def generate_report
    p = Axlsx::Package.new

    img = File.expand_path('../image1.jpeg', __FILE__)

    p.workbook.add_worksheet(:name => "ChemOffice") do |sheet|
      sheet.add_row ["First Column", "Second", "Third"]
      sheet.add_row [1, 2, 3]


      sheet.add_image(:image_src => img, :noMove => true) do |image|
        image.start_at 22, 14
        image.end_at 23, 17
      end
    end

    s = p.to_stream()
  end
end
