require 'export_table'

module Export
  class ExportExcel < ExportTable # rubocop:disable Metrics/ClassLength
    DEFAULT_ROW_WIDTH = 100
    DEFAULT_ROW_HEIGHT = 20
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
      sheet = @xfile.workbook.add_worksheet(name: table.to_s) # do |sheet|
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
      # end
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

    # Column keys pulled from the SQL result row for each sample.
    COMPOSITION_SAMPLE_KEYS = [
      'sample external label',
      'sample name',
      'short label',
      'sample uuid',
    ].freeze

    # Headers for the calculated composition columns, matching the UI table.
    COMPOSITION_COMP_HEADERS = [
      'Source',
      'Weight ratio exp.',
      'Molar Mass (g/mol)',
      'Weight ratio calc./%',
      'Weight ratio (calc)/MM',
      'Molar ratio (calc)/MM',
      'Molar ratio exp/%',
      'Molar ratio calc/%',
    ].freeze

    # Generates a composition table sheet replicating all calculations from
    # the frontend sampleHierarchicalCompositions.js utility.
    #
    # Columns: sample identification + HierarchicalMaterial properties,
    # followed by 8 composition calculation columns per component.
    # A bold totals row is appended after each sample's component rows.
    def generate_composition_table_components_sheet_with_samples(table, samples = nil) # rubocop:disable Metrics/MethodLength
      @samples = samples
      return if samples.nil?

      headers = COMPOSITION_SAMPLE_KEYS + COMPOSITION_COMP_HEADERS
      sheet = @xfile.workbook.add_worksheet(name: table)
      grey       = sheet.styles.add_style(sz: 12, b: true, border: { style: :thick, color: 'FF777777', edges: [:bottom] })
      light_grey = sheet.styles.add_style(border: { style: :thick, color: 'FFCCCCCC', edges: [:top] })
      sheet.add_row(headers, style: grey)

      samples.each do |sample|
        sample_values = COMPOSITION_SAMPLE_KEYS.map { |col| sample[col] }
        components    = begin
                          JSON.parse(sample['components'] || '[]')
                        rescue StandardError
                          []
                        end
        hm_components = components.select { |c| c['name'] == 'HierarchicalMaterial' }

        if hm_components.empty?
          sheet.add_row(sample_values + Array.new(COMPOSITION_COMP_HEADERS.size), style: light_grey)
          next
        end

        result = build_composition_rows(hm_components)
        result[:rows].each do |row|
          comp_values = [
            row[:source_alias],
            row[:weight_ratio_exp],
            row[:molar_mass],
            row[:weight_ratio_calc_processed],
            row[:molar_ratio_calc_mm],
            row[:weight_ratio_calc_mm_col9],
            row[:molar_ratio_exp_percent],
            row[:molar_ratio_calc_percent],
          ]
          sheet.add_row(sample_values + comp_values, style: light_grey)
        end

      end

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
          else
            sample[column]
          end
        end
        data[@image_index] = svg_path(sample) if @image_index
      # elsif sample['ts'] == 't' || sample['ts'].equal?(true)
      #   return Array.new(@headers.size)data = headers.map { |column| sample[column] }
      else
        dl = sample['dl_wp'] && sample['dl_wp'].to_i ||
          sample['dl_r'] && sample['dl_r'].to_i || 0
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
      image = Magick::Image.read(svg_path) { self.format('SVG'); }.first
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

    private

    # Translates Component#parseComponentSource from the JS frontend model.
    # Returns a hash with :source, :component, :weight_ratio_calc.
    def parse_component_source(source)
      return { source: source, component: nil, weight_ratio_calc: 0.0 } if source.nil? || source.empty?

      if source.include?('%')
        match = source.strip.match(/\A\d+/)
        { source: source, component: source.strip, weight_ratio_calc: match ? match[0].to_f : 0.0 }
      else
        parts = source.split('-')
        { source: source, component: parts[1], weight_ratio_calc: 0.0 }
      end
    end

    # Returns the weight ratio for a component whose source does not encode a
    # percentage — equivalent to Component#calcWeightRatioWithoutWeight.
    def calc_weight_ratio_without_weight(components)
      sum = components.sum { |item| parse_component_source(item['source'].to_s)[:weight_ratio_calc] }
      100.0 - sum
    end

    # Replicates buildHierarchicalMaterialRows from sampleHierarchicalCompositions.js.
    # Accepts an array of HierarchicalMaterial component hashes and returns
    #   { rows: [...], total_molar_calc: Float, total_molar_exp: Float }
    # Each row hash contains the keys consumed by generate_composition_table_components_sheet_with_samples.
    def build_composition_rows(components) # rubocop:disable Metrics/MethodLength
      rows_data        = []
      total_molar_calc = 0.0
      total_molar_exp  = 0.0

      components.each do |comp|
        molar_mass       = comp['molar_mass'].to_f
        weight_ratio_exp = comp['weight_ratio_exp'].to_f
        parsed           = parse_component_source(comp['source'].to_s)
        wrc_float        = parsed[:weight_ratio_calc].to_f

        weight_ratio_calc_processed = wrc_float > 0 ? wrc_float : calc_weight_ratio_without_weight(components)

        molar_ratio_calc_mm = molar_mass > 0 ? (weight_ratio_calc_processed / molar_mass).round(10) : 0.0
        molar_ratio_exp_mm  = molar_mass > 0 ? (weight_ratio_exp / molar_mass).round(10) : 0.0

        total_molar_calc = (total_molar_calc + molar_ratio_calc_mm).round(10)
        total_molar_exp  = (total_molar_exp  + molar_ratio_exp_mm).round(10)

        rows_data << {
          source_alias:                parsed[:source],
          molar_mass:                  molar_mass,
          weight_ratio_exp:            weight_ratio_exp,
          weight_ratio_calc_processed: weight_ratio_calc_processed,
          molar_ratio_calc_mm:         molar_ratio_calc_mm,
          molar_ratio_exp_mm:          molar_ratio_exp_mm,
        }
      end

      rows_with_percentages = rows_data.map do |row|
        molar_ratio_calc_percent  = total_molar_calc > 0 ? (row[:molar_ratio_calc_mm] / total_molar_calc).round(3) : '-'
        molar_ratio_exp_percent   = total_molar_exp  > 0 ? (row[:molar_ratio_exp_mm]  / total_molar_exp).round(3)  : '-'
        weight_ratio_calc_mm_col9 = row[:molar_mass] > 0 ? (row[:weight_ratio_exp] / row[:molar_mass]).round(3) : nil

        row.merge(
          molar_ratio_calc_mm:       row[:molar_ratio_calc_mm].round(3),
          weight_ratio_calc_mm_col9: weight_ratio_calc_mm_col9,
          molar_ratio_exp_percent:   molar_ratio_exp_percent,
          molar_ratio_calc_percent:  molar_ratio_calc_percent,
        )
      end

      sorted = rows_with_percentages.sort_by { |r| r[:weight_ratio_calc_processed].to_f }
      { rows: sorted, total_molar_calc: total_molar_calc.round(3), total_molar_exp: total_molar_exp.round(3) }
    end
  end
end
