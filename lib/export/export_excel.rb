# frozen_string_literal: true
require 'export_table'
require 'base64'

module Export
  class ExportExcel < ExportTable # rubocop:disable Metrics/ClassLength
    DEFAULT_ROW_WIDTH = 100
    DEFAULT_ROW_HEIGHT = 20
    # Default pixel size for SVG→PNG export (Inkscape); kept in line with ImageMagick’s natural SVG size.
    DEFAULT_IMAGE_EXPORT_MAX_WIDTH = 180
    DEFAULT_IMAGE_EXPORT_MAX_HEIGHT = 180
    # Export at this multiple then downscale so embedded rasters stay sharp (supersampling).
    INKSCAPE_EXPORT_SCALE = 3

    DECOUPLED_STYLE = {
      b: true,
      fg_color: 'CEECF5',
      bg_color: 'FF777777',
      border: {
        style: :thick,
        color: 'FF777777',
        edges: [:bottom],
      }
    }

    def initialize(**args)
      @xfile = Axlsx::Package.new
      @file_extension = 'xlsx'
      @xfile.workbook.styles.fonts.first.name = 'Calibri'
    end

    def generate_sheet_with_samples(table, samples = nil, selected_columns = nil)
      @samples = samples
      return if samples.nil? # || samples.count.zero?

      generate_headers(table, [], selected_columns)
      sheet = @xfile.workbook.add_worksheet(name: table.to_s)
      grey = sheet.styles.add_style(sz: 12, border: { style: :thick, color: 'FF777777', edges: [:bottom] })
      sheet.add_row(@headers, style: grey) # Add header
      decoupled_style = sheet.styles.add_style(DECOUPLED_STYLE)
      ['decoupled', 'molecular mass (decoupled)', 'sum formula (decoupled)', 'sample uuid'].each do |e|
        s_idx = @headers.find_index(e)
        next if s_idx.nil? # Skip styling if the header is not found

        sheet.rows[0].cells[s_idx].style = decoupled_style
      end
      image_width = DEFAULT_ROW_WIDTH
      row_height = DEFAULT_ROW_HEIGHT
      row_image_width = DEFAULT_ROW_WIDTH
      decouple_idx = @headers.find_index('decoupled')
      samples.each_with_index do |sample, row|
        filtered_sample = filter_with_permission_and_detail_level(sample)
        if @image_index && (svg_path = filtered_sample[@image_index].presence)
          image_data = process_and_add_image(sheet, svg_path, row)
          row_height = [image_data&.fetch(:height, nil).to_i, DEFAULT_ROW_HEIGHT].max
          row_image_width = image_data&.fetch(:width, nil) || DEFAULT_ROW_WIDTH
          filtered_sample[@image_index] = ''
        end
        image_width = row_image_width if row_image_width > image_width
        # 3/4 -> The misterious ratio!
        if filtered_sample[decouple_idx].present?
          filtered_sample[decouple_idx] = filtered_sample[decouple_idx].presence == true ? 'yes' : 'No'
        end

        size = sheet.styles.add_style :sz => 12
        sheet.add_row filtered_sample, :height => row_height * 3 / 4, :style=>[size]
      end
      sheet.column_info[@image_index].width = image_width / 8 if @image_index
      @samples = nil
    end

    # Generates an Excel sheet that includes sample rows along with their associated components.
    #
    # @param table [Symbol, String] The name of the sheet to be created.
    # @param samples [Array<Hash>, nil] An array of sample hashes that include component data.
    # @param selected_columns [Array<String>] The columns to include in the sheet.
    # @return [void]
    def generate_components_sheet_with_samples(table, samples = nil, selected_columns)
      @samples = samples
      return if samples.nil?

      generate_headers(table, [], selected_columns)

      sheet = @xfile.workbook.add_worksheet(name: table.to_s)
      grey = sheet.styles.add_style(sz: 12, border: { style: :thick, color: 'FF777777', edges: [:bottom] })
      light_grey = sheet.styles.add_style(border: { style: :thick, color: 'FFCCCCCC', edges: [:top] })

      # Add header row with units
      sheet.add_row(@headers.map { |h| Export::ExportComponents.header_with_units(h) }, style: grey)
      decoupled_style = sheet.styles.add_style(DECOUPLED_STYLE)
      ['sample uuid'].each do |e|
        s_idx = @headers.find_index(e)
        sheet.rows[0].cells[s_idx].style = decoupled_style
      end
      row_length = @headers.size

      samples.each do |sample|
        # Add the sample's ID row (if components exist)
        sample_id_row = (@row_headers & HEADERS_SAMPLE_ID).map { |column| sample[column] }
        sample_id_row[row_length - 1] = nil
        components = prepare_sample_component_data(sample)
        sheet.add_row(sample_id_row, style: light_grey) if components.present?

        # Add each component row
        components.each do |component|
          component_row = @headers.map { |column| Export::ExportComponents.format_component_value(column, component[column]) }
          sheet.add_row(component_row, sz: 12) if component_row.compact.present?
        end
      end

      @samples = nil
    end

    #TODO: implement better detail level filter
    def generate_analyses_sheet_with_samples(table, samples = nil, selected_columns)
      @samples = samples
      return if samples.nil? # || samples.count.zero?
      generate_headers(table, [], selected_columns)
      sheet = @xfile.workbook.add_worksheet(name: table.to_s)
      grey = sheet.styles.add_style(sz: 12, :border => { :style => :thick, :color => "FF777777", :edges => [:bottom] })
      light_grey = sheet.styles.add_style(:border => { :style => :thick, :color => "FFCCCCCC", :edges => [:top] })
      sheet.add_row(@headers, style: grey) # Add header
      decoupled_style = sheet.styles.add_style(DECOUPLED_STYLE)
      ['sample uuid'].each do |e|
        s_idx = @headers.find_index(e)
        sheet.rows[0].cells[s_idx].style = decoupled_style
      end
      image_width = DEFAULT_ROW_WIDTH
      row_height = DEFAULT_ROW_HEIGHT
      row_image_width = DEFAULT_ROW_WIDTH
      row_length = @headers.size
      samples.each_with_index do |sample, row|
        if (sample['shared_sync'] == 'f' || sample['shared_sync'] == false || sample['dl_s'] = 10)
          data = (@row_headers & HEADERS_SAMPLE_ID).map { |column| sample[column] }
          data[row_length - 1] = nil
          analyses = prepare_sample_analysis_data(sample)
          sheet.add_row(data, style: light_grey) if analyses.present?
          analyses.each do |an|
            data = @headers.map { |column| an[column] }
            sheet.add_row(data, sz: 12) if data.compact.present?
            (an['datasets'] || []).map do |dataset|
              data = @headers.map { |column| dataset[column] }
              sheet.add_row(data, sz: 12) if data.compact.present?
              (dataset['attachments'] || []).map do |att|
                data = @headers.map { |column| att[column] }
                sheet.add_row(data, sz: 12) if data.compact.present?
              end
            end
          end
        end
      end
      @samples = nil
    end

    def read
      @xfile.to_stream.read
    end

    def prepare_sample_analysis_data(sample)
      JSON.parse(sample['analyses'].presence || '[]').map do |an|
        an['content'] = quill_to_html_to_string(an['content'])
        an
      end
    end

    # Prepares the component data for a given sample by parsing JSON and converting rich text content to plain HTML string.
    #
    # @param sample [Hash] A hash representing a sample, expected to contain a JSON string under the 'components' key.
    # @return [Array<Hash>] An array of component hashes with 'content' converted to HTML string.
    def prepare_sample_component_data(sample)
      components = JSON.parse(sample['components'].presence || '[]')
      components.map do |component|
        component['content'] = quill_to_html_to_string(component['content'])
        component
      end
    end

    def literatures_info(ids)
      output = []
      ids&.split(',')&.each do |id|
        lit = Literature.find(id)
        return '' if lit.nil?

        bib = lit[:refs] && lit[:refs]['bibtex']
        bb = DataCite::LiteraturePaser.parse_bibtex!(bib, id)
        bb = DataCite::LiteraturePaser.get_metadata(bb, lit[:doi], id) unless bb.class == BibTeX::Entry
        output.push(DataCite::LiteraturePaser.excel_string(lit, bb)) if bb.class == BibTeX::Entry
      end
      output = output.join("\n")
      output
    end

    def filter_with_permission_and_detail_level(sample)
      # return all data if sample/chemical in own collection
      if sample['shared_sync'] == 'f' || sample['shared_sync'] == false
        headers = @headers
        reference_values = ['melting pt', 'boiling pt']
        data = headers.map do |column|
          if column == 'literatures'
            literatures_info(sample[column])
          elsif reference_values.include?(column)
            regex = /[\[\]()]/
            string = sample[column].gsub(regex, '')
            string.split(',').join(' - ')
          elsif column == 'solvent'
            extract_label_from_solvent_column(sample[column]) || ''
          elsif column == 'refractive index'
            sample['refractive_index']
          elsif column == 'flash point'
            flash_point_format(sample['flash_point'])
          elsif column == 'molarity'
            "#{sample['molarity_value']} #{sample['molarity_unit']}"
          elsif column == 'density'
            "#{sample['density']} g/ml"
          elsif column == 'molfile'
            sample[column]
          else
            sample[column]
          end
        end
        data[@image_index] = svg_path(sample) if @image_index
      else
        dl = sample['dl_wp'] && sample['dl_wp'].to_i ||
          sample['dl_r'] && sample['dl_r'].to_i || 0
        # NB: as of now , only dl 0 and 10 are implemented
        dl = 10 if dl.positive?
        headers = instance_variable_get("@headers#{sample['dl_s']}#{dl}")
        data = headers.map do |column|
          next nil unless column
          sample[column]
        end
        data[@image_index] = svg_path(sample) if headers.include?('image')
      end
      data
    end

    def svg_path(sample)
      sample_svg_path = sample['image'].presence
      molecule_svg_path = sample['m_image'].presence
      return nil unless (svg_file_name = sample_svg_path || molecule_svg_path)
      file_path = File.join(
        Rails.root, 'public', 'images', sample_svg_path ? 'samples' : 'molecules', svg_file_name
      )
      File.exist?(file_path) ? file_path : nil
    end

    def process_and_add_image(sheet, svg_path, row)
      image_data = get_image_from_svg(svg_path)
      img_src = image_data[:path]
      sheet.add_image(image_src: img_src, noMove: true) do |img|
        img.width = image_data[:width]
        img.height = image_data[:height]
        img.start_at @image_index, row + 1
      end
      image_data
    end

    # Converts SVG to PNG for Excel. SVGs with embedded <image> use Inkscape (data: → file://); others use ImageMagick.
    def get_image_from_svg(svg_path)
      has_embedded = svg_has_embedded_images?(svg_path)

      if has_embedded
        svg_to_use_path, _temp_svg, _temp_images = svg_with_embedded_images_as_files(svg_path)
        png_path, width, height = convert_svg_to_png_with_inkscape(svg_to_use_path)
        return { path: png_path, width: width, height: height } if png_path
      end

      image = Magick::Image.read(svg_path) { self.format('SVG'); }.first
      image.format = 'png'
      file = create_file(image.to_blob)
      { path: file.path, width: image.columns, height: image.rows }
    end

    def svg_has_embedded_images?(svg_path)
      return false unless File.file?(svg_path)

      content = File.read(svg_path, encoding: 'UTF-8')
      content.include?('<image') ||
        content.include?('epam-ketcher-ssc') ||
        content.include?('xlink:href="data:image') ||
        content.include?('href="data:image')
    end

    # Writes each data:image/...;base64,... to a temp file and replaces with file:// + xlink:href for Inkscape.
    def svg_with_embedded_images_as_files(svg_path)
      content = File.read(svg_path, encoding: 'UTF-8')
      temp_images = []
      new_content = content.gsub(%r{(?:href|xlink:href)="(data:image/([^;]+);base64,([^"]+))"}) do
        mime = Regexp.last_match(2)
        b64 = Regexp.last_match(3)
        ext = mime == 'svg+xml' ? '.svg' : '.png'
        decoded = Base64.decode64(b64)
        tmp = Tempfile.new(['embed', ext])
        tmp.binmode
        tmp.write(decoded)
        tmp.flush
        tmp.close
        temp_images << tmp
        %(xlink:href="file://#{tmp.path}" href="file://#{tmp.path}")
      end
      return [svg_path, nil, []] if temp_images.empty?

      tmp_svg = Tempfile.new(['svg_with_files', '.svg'])
      tmp_svg.write(new_content)
      tmp_svg.flush
      tmp_svg.close
      [tmp_svg.path, tmp_svg, temp_images]
    end

    def convert_svg_to_png_with_inkscape(svg_path, max_width: DEFAULT_IMAGE_EXPORT_MAX_WIDTH, max_height: DEFAULT_IMAGE_EXPORT_MAX_HEIGHT)
      require 'reporter/img/conv'
      width, height = svg_export_dimensions(svg_path, max_width, max_height)
      scale = INKSCAPE_EXPORT_SCALE
      export_w = (width * scale).round
      export_h = (height * scale).round
      png_file = Tempfile.new(['image', '.png'])
      png_file.close
      Reporter::Img::Conv.by_inkscape(svg_path, png_file.path, 'png', width: export_w, height: export_h)
      # Downscale so embedded rasters are supersampled and look sharp at display size
      resized_path, = downscale_png_to(png_file.path, width, height)
      [resized_path, width, height]
    rescue StandardError => _e
      [nil, nil, nil]
    end

    # Resizes a PNG file to target dimensions; returns [path_to_resized_file, width, height].
    # Uses Lanczos filter for sharper downscaling and smoother gradients (e.g. orbs, diagrams).
    def downscale_png_to(png_path, target_width, target_height)
      image = Magick::Image.read(png_path).first
      resized = image.resize(target_width, target_height, Magick::LanczosFilter, 1.0)
      file = create_file(resized.to_blob)
      [file.path, target_width, target_height]
    end

    # Returns [width, height] for Inkscape export so the image fits within max_width×max_height while preserving SVG aspect ratio.
    def svg_export_dimensions(svg_path, max_width, max_height)
      w, h = svg_natural_dimensions(svg_path)
      return [max_width, max_height] if w.nil? || h.nil? || w <= 0 || h <= 0

      scale = [max_width.to_f / w, max_height.to_f / h].min
      [(w * scale).round, (h * scale).round]
    end

    # Parses SVG for viewBox or width/height; returns [width, height] in pixels or [nil, nil].
    def svg_natural_dimensions(svg_path)
      return [nil, nil] unless File.file?(svg_path)

      content = File.read(svg_path, encoding: 'UTF-8')
      # viewBox="minX minY width height"
      if content =~ /viewBox\s*=\s*["']?\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/
        return [Regexp.last_match(1).to_f.ceil, Regexp.last_match(2).to_f.ceil]
      end
      # width and height attributes (e.g. width="200" or width="200px")
      w = content[/width\s*=\s*["']?\s*([\d.]+)/, 1]
      h = content[/height\s*=\s*["']?\s*([\d.]+)/, 1]
      return [w.to_f.ceil, h.to_f.ceil] if w && h
      [nil, nil]
    end

    def create_file(png_blob)
      file = Tempfile.new(['image', '.png'])
      file.binmode
      file.write(png_blob)
      file.flush
      file
    end

    private
  end
end
