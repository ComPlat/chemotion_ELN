class ExcelExport
  def initialize
    @@sample_list = Array.new
  end

  def add_sample(sample)
    @@sample_list << sample
  end

  def generate_file
    p = Axlsx::Package.new

    img = File.expand_path('../image1.jpeg', __FILE__)

    p.workbook.styles.fonts.first.name = 'Calibri'
    p.workbook.add_worksheet(:name => "ChemOffice") do |sheet|
      sheet.add_row ["", "", "", "", "", ""]
      sheet.add_row ["Bild", "", "", "Name", "Short Label", "Smiles Code"], :b => true, :sz => 12

      width = 0
      @@sample_list.each_with_index do |sample, row|
        sample_info = Chemotion::OpenBabelService.molecule_info_from_molfile sample.molfile
        image_data = get_image_from_svg(sample_info[:svg])

        sheet.add_image(:image_src => image_data[:path], :noMove => true) do |image|
          image.width = image_data[:width]
          image.height = image_data[:height]
          image.start_at 0, row + 2
        end

        sheet.add_row ["", "A", row+1, sample_info[:title_legacy], sample_info[:formula], sample_info[:smiles]], :sz => 12, :height => image_data[:height] * 3/4 # 3/4 -> The misterious ratio!

        if image_data[:width] > width # Get the biggest image size to set the column
          width = image_data[:width]
        end
      end

      sheet.column_info.first.width = width/8 # 1/8 -> The second misterious ratio (library bug?)
    end

    p.to_stream().read()
  end

  def get_image_from_svg(svg)
    image = Magick::Image.from_blob(svg) { self.format = 'SVG'; }.first
    image.format = 'png'
    png_blob = image.to_blob

    width = image.columns
    height = image.rows

    file = Tempfile.new(['image', '.png'])
    file.binmode
    file.write png_blob
    file.flush
    file.close

    return {path: file.path, width: width, height: height}
  end
end
