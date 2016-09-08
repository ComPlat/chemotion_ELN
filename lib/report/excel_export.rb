class Report::ExcelExport
  def initialize
    @@sample_list = Array.new
  end

  def add_sample(sample)
    @@sample_list << sample
  end

  def generate_file excluded_field, included_field
    return -1 if @@sample_list.empty? || @@sample_list.first == nil

    p = Axlsx::Package.new
    img = File.expand_path('../image1.jpeg', __FILE__)

    p.workbook.styles.fonts.first.name = 'Calibri'
    p.workbook.add_worksheet(:name => "ChemOffice") do |sheet|
      header = @@sample_list.first.attribute_names
      # Exclude field
      header.delete_if { |x| excluded_field.include?(x) }
      header = header.reject { |x| x.empty? }
      header = header.uniq
      associate_length = header.length
      # Include field
      associate_model = included_field.first.split(".")[0]
      included_field = included_field.map! {|x|
        x.slice!(associate_model + ".")
        x
      }
      header = ["Image"] + header + included_field

      # Add header
      sheet.add_row header

      width = 0
      files = [] # do not let Tempfile object to be garbage collected

      @@sample_list.compact.each_with_index do |sample, row|
        svg_path = Rails.root.to_s + '/public' + sample.get_svg_path
        image_data = get_image_from_svg(svg_path, files)
        img_src = image_data[:path]
        sheet.add_image(:image_src => img_src,:noMove => true) do |img|
          img.width = image_data[:width]
          img.height = image_data[:height]
          img.start_at 0, row + 1
        end

        # 3/4 -> The misterious ratio!
        # See column explanation below
        data_hash = [""]
        (1..header.length - 1).each do |index|
          key = header[index]
          data = sample.attributes[key]
          if index > (associate_length - 1)
            asso = sample.send(associate_model)
            data = asso.attributes[key]
          end
          data_hash << data
        end
        sheet.add_row data_hash,
                      :sz => 12,
                      :height => image_data[:height] * 3/4

        # Get the biggest image size to set the column
        if image_data[:width] > width
          width = image_data[:width]
        end
      end

      # 1/8 -> The second misterious ratio (library bug?)
      # The creator mentioned about this
      # https://github.com/randym/axlsx/issues/125#issuecomment-16834367
      sheet.column_info.first.width = width/8
    end

    p.to_stream().read()
  end

  def get_image_from_svg(svg_path, files)
    image = Magick::Image.read(svg_path) { self.format = 'SVG'; }.first
    image.format = 'png'
    png_blob = image.to_blob

    width = image.columns
    height = image.rows

    file = Tempfile.new(['image', '.png'])
    file.binmode
    file.write png_blob
    file.flush
    file.close
    files << file # do not let Tempfile object to be garbage collected

    return {path: file.path, width: width, height: height}
  end
end
