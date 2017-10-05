class Reporter::ExcelExport
  DEFAULT_ROW_WIDTH = 100
  DEFAULT_ROW_HEIGHT = 20

  def initialize
    @sample_list = Array.new
  end

  def add_sample(sample)
    @sample_list << sample
  end

  def generate_file(default_excluded_field, default_included_field, removed_field = [])
    return -1 if @sample_list.empty? || @sample_list.first == nil
    header = process_header(default_excluded_field, default_included_field, removed_field)
    return -1 if header.empty?
    p = Axlsx::Package.new
    p.workbook.styles.fonts.first.name = 'Calibri'
    p.workbook.add_worksheet(:name => "ChemOffice") do |sheet|
      sheet.add_row(fix_typo(header)) # Add header

      width = 0
      files = [] # do not let Tempfile object to be garbage collected
      need_images = header.index("Image")

      @sample_list.compact.each_with_index do |sample, row|
        data_hash = []
        start = 0

        if need_images
          data_hash = [""]
          start = 1
          image_data = process_and_add_image(sheet, sample, row, files)
        end

        process_row_data(start, header, sample, data_hash)
        row_width, row_height = row_geometry(image_data)
        width = row_width if row_width > width # Get the biggest image size to set the column

        sheet.add_row(data_hash, sz: 12, height: row_height * 3 / 4) # 3/4 -> The misterious ratio!
      end

      # 1/8 -> The second misterious ratio (library bug?)
      # The creator mentioned about this
      # https://github.com/randym/axlsx/issues/125#issuecomment-16834367
      sheet.column_info.first.width = need_images ? width / 8 : 40
    end

    p.to_stream().read()
  end

  def process_header(default_excluded_field, default_included_field, removed_field)
      header = @sample_list.first.attribute_names
      # Exclude field
      header.delete_if { |x| default_excluded_field.include?(x) }
      header = header.reject { |x| x.empty? }
      header = header.uniq
      # Include field
      default_included_field = default_included_field.map! {|x|
        x.slice!("molecule.")
        x
      }
      header = ["Image"] + header + default_included_field - removed_field
      return header
  end

  def process_row_data(start, header, sample, data_hash)
    (start..header.length - 1).each do |index|
      key = header[index]
      if is_molecule_attribute(key)
        asso = sample.send("molecule")
        data = asso.attributes[key]
      elsif key == 'molecule_name' && (nid = sample.molecule_name_id)
        data = MoleculeName.find_by(id: nid)&.attributes['name']
      else
        data = sample.attributes[key]
      end
      data_hash << data
    end
  end

  def is_molecule_attribute(key)
    ["cano_smiles", "sum_formular", "inchistring", 'inchikey',
      "molecular_weight"].index(key)
  end

  def process_and_add_image(sheet, sample, row, files)
    svg_path = Rails.root.to_s + '/public' + sample.get_svg_path
    image_data = get_image_from_svg(svg_path, files)
    img_src = image_data[:path]
    sheet.add_image(image_src: img_src, noMove: true) do |img|
      img.width = image_data[:width]
      img.height = image_data[:height]
      img.start_at 0, row + 1
    end
    return image_data
  end

  def row_geometry(image_data = nil)
    row_width = DEFAULT_ROW_WIDTH
    row_height = DEFAULT_ROW_HEIGHT
    if image_data
      row_height = image_data[:height]
      row_width = image_data[:width]
    end
    return row_width, row_height
  end

  def get_image_from_svg(svg_path, files)
    png_blob, width, height = process_image(svg_path)
    file = create_file(png_blob)
    files << file # do not let Tempfile object to be garbage collected
    return {path: file.path, width: width, height: height}
  end

  def process_image(svg_path)
    image = Magick::Image.read(svg_path) { self.format = 'SVG'; }.first
    image.format = 'png'
    return image.to_blob, image.columns, image.rows
  end

  def create_file(png_blob)
    file = Tempfile.new(['image', '.png'])
    file.binmode
    file.write(png_blob)
    file.flush
    file.close
    return file
  end

  def fix_typo(inputs)
    inputs.map { |i| i == "sum_formular" ? "sum_formula" : i }
  end
end
