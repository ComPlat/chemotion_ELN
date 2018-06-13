require 'export_table'

module Export
  class ExportExcel < ExportTable
    DEFAULT_ROW_WIDTH = 100
    DEFAULT_ROW_HEIGHT = 20

    def initialize(**args)
      @xfile = Axlsx::Package.new
      @file_extension = 'xlsx'
      @xfile.workbook.styles.fonts.first.name = 'Calibri'
    end

    def generate_sheet_with_samples(table, samples = nil)
      @samples = samples
      return if samples.nil? # || samples.count.zero?
      generate_headers(table)
      sheet = @xfile.workbook.add_worksheet(name: table.to_s) #do |sheet|
      grey = sheet.styles.add_style(sz: 12, :border => { :style => :thick, :color => "FF777777", :edges => [:bottom] })
      light_grey = sheet.styles.add_style(bg_color: "FFCCCCCC",:border => { :style => :thin, :color => "FFCCCCCC", :edges => [:top] })
      sheet.add_row(@headers, style: grey) # Add header
      image_width = DEFAULT_ROW_WIDTH
      row_height = DEFAULT_ROW_HEIGHT
      row_image_width = DEFAULT_ROW_WIDTH
      row_length = @headers.size
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
        sheet.add_row(filtered_sample, sz: 12, height: row_height * 3 / 4)
      end
      sheet.column_info[@image_index].width = image_width / 8 if @image_index
      # end
      @samples = nil
    end

    #TODO: implement better detail level filter
    def generate_analyses_sheet_with_samples(table, samples = nil, selected_columns)
      @samples = samples
      return if samples.nil? # || samples.count.zero?
      generate_headers(table, [], selected_columns)
      sheet = @xfile.workbook.add_worksheet(name: table.to_s) #do |sheet|
      grey = sheet.styles.add_style(sz: 12, :border => { :style => :thick, :color => "FF777777", :edges => [:bottom] })
      light_grey = sheet.styles.add_style(:border => { :style => :thick, :color => "FFCCCCCC", :edges => [:top] })
      sheet.add_row(@headers, style: grey) # Add header
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
            sheet.add_row(data, sz: 12)  if data.compact.present?
            an['datasets'].map do |dataset|
              data = @headers.map { |column| dataset[column] }
              sheet.add_row(data, sz: 12) if data.compact.present?
              dataset['attachments'].map do |att|
                data = @headers.map { |column| att[column] }
                sheet.add_row(data, sz: 12) if data.compact.present?
              end
            end
          end
        end
      end
      # end
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

    def filter_with_permission_and_detail_level(sample)
      # return all data if sample in own collection
      if sample['shared_sync'] == 'f' || sample['shared_sync'] == false
        headers = @headers
        data = headers.map { |column| sample[column] }
        data[@image_index] = svg_path(sample) if @image_index
      # elsif sample['ts'] == 't' || sample['ts'].equal?(true)
      #   return Array.new(@headers.size)data = headers.map { |column| sample[column] }
      else
        dl = sample['dl_wp'] || sample['dl_r'] || 0
        # NB: as of now , only dl 0 and 10 are implemented
        dl = 10 if dl.positive?
        headers = instance_variable_get("@headers#{sample['dl_s']}#{dl}")
        data = headers.map { |column| column ? sample[column] : nil }
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

    def get_image_from_svg(svg_path)
      image = Magick::Image.read(svg_path) { self.format = 'SVG'; }.first
      image.format = 'png'
      file = create_file(image.to_blob)
      { path: file.path, width: image.columns, height: image.rows }
    end

    def create_file(png_blob)
      file = Tempfile.new(['image', '.png'])
      file.binmode
      file.write(png_blob)
      file.flush
      # file.close
      file
    end
  end
end
