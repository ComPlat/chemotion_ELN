require 'export_table'

module Export
  class ExportExcel < ExportTable
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
        hierarchical_components = prepare_hierarchical_material_data(sample)
        
        # Add sample ID row if there are any components (regular or hierarchical)
        sheet.add_row(sample_id_row, style: light_grey) if components.present? || hierarchical_components.present?

        # Add each regular component row
        components.each do |component|
          component_row = @headers.map { |column| Export::ExportComponents.format_component_value(column, component[column]) }
          sheet.add_row(component_row, sz: 12) if component_row.compact.present?
        end
      end

      @samples = nil
    end

    # Generates an Excel sheet that includes sample rows along with their associated hierarchical components.
    #
    # @param table [Symbol, String] The name of the sheet to be created.
    # @param samples [Array<Hash>, nil] An array of sample hashes that include hierarchical component data.
    # @return [void]
    def generate_composition_table_components_sheet_with_samples(table, samples = nil)
      @samples = samples
      return if samples.nil?

      # Initialize headers to get @row_headers set up
      generate_headers(table, [], [])
      
      # Only include the 8 composition table columns for hierarchical materials
      # Order matches the JavaScript table: Source, Weight ratio exp., Molar Mass, Weight ratio calc./%,
      # weight ratio (calc)/molar mass, molar ratio (calc)/molar mass, Molar ratio exp / %, Molar ratio calc / %
      composition_table_columns = %w[sourceAlias weight_ratio_exp molar_mass weightRatioCalcProcessed 
                                     molarRatioCalcMM weightRatioCalcMM molarRatioExpPercent molarRatioCalcPercent]
      @headers = (@row_headers & HEADERS_SAMPLE_ID) + composition_table_columns
      
      sheet = @xfile.workbook.add_worksheet(name: table)
      grey = sheet.styles.add_style(sz: 12, :border => { :style => :thick, :color => "FF777777", :edges => [:bottom] })
      light_grey = sheet.styles.add_style(:border => { :style => :thick, :color => "FFCCCCCC", :edges => [:top] })
      sheet.add_row(@headers, style: grey) # Add header
      decoupled_style = sheet.styles.add_style(DECOUPLED_STYLE)
      ['sample uuid'].each do |e|
        s_idx = @headers.find_index(e)
        sheet.rows[0].cells[s_idx].style = decoupled_style if s_idx
      end

      samples.each do |sample|
        sample_id_row = (@row_headers & HEADERS_SAMPLE_ID).map { |column| sample[column] }
        hierarchical_components = prepare_hierarchical_material_data(sample)
        if hierarchical_components.present?
          hierarchical_components.each do |comp|
            row = sample_id_row + [
              comp['sourceAlias'] || comp['source'] || '',
              comp['weight_ratio_exp'] || 0.0,
              comp['molar_mass'] || 0.0,
              comp['weightRatioCalcProcessed'] || 0.0,
              comp['molarRatioCalcMM'] || 0.0,
              comp['weightRatioCalcMM'] || nil,
              comp['molarRatioExpPercent'] || '-',
              comp['molarRatioCalcPercent'] || '-'
            ]
            sheet.add_row(row, style: light_grey)
          end
        else
          # fallback: just add sample row if no hierarchical components
          row = sample_id_row + Array.new(composition_table_columns.size, nil)
          sheet.add_row(row, style: light_grey)
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

    # Prepares hierarchical material component data with calculated values following the same logic as
    # sampleHierarchicalCompositions.js
    #
    # @param sample [Hash] A hash representing a sample, expected to contain a JSON string under the 'components' key.
    # @return [Array<Hash>] An array of hierarchical material component hashes with calculated values.
    def prepare_hierarchical_material_data(sample)
      components = JSON.parse(sample['components'].presence || '[]')
      hierarchical_components = components.select { |comp| comp['name'] == 'HierarchicalMaterial' }
      return [] if hierarchical_components.empty?

      rows_data = []
      total_molar_calc = 0.0
      total_molar_exp = 0.0

      # First pass: calculate totals and prepare row data
      hierarchical_components.each_with_index do |item, index|
        # Components from database query have fields at top level, not nested in component_properties
        component_props = item['component_properties'] || {}
        # Fallback to top-level fields if component_properties is empty (database query structure)
        source = component_props['source'] || item['source'] || ''
        molar_mass = (component_props['molar_mass'] || item['molar_mass']).to_f rescue 0.0
        weight_ratio_exp = (component_props['weight_ratio_exp'] || item['weight_ratio_exp']).to_f rescue 0.0
        template_category = component_props['template_category'] || item['template_category'] || ''
        molar_mass_state_value = molar_mass
        weight_ratio_exp_state_value = weight_ratio_exp

        # Parse source to extract weightRatioCalc (similar to parseComponentSource)
        weight_ratio_calc = parse_component_source_weight_ratio(source)
        weight_ratio_calc_processed = weight_ratio_calc > 0 ? weight_ratio_calc : calc_weight_ratio_without_weight(hierarchical_components)

        # Calculate molar ratios (weight ratio / molar mass)
        molar_ratio_calc_mm = molar_mass_state_value > 0 ? (weight_ratio_calc_processed / molar_mass_state_value).round(10) : 0.0
        molar_ratio_exp_mm = molar_mass_state_value > 0 ? (weight_ratio_exp_state_value / molar_mass_state_value).round(10) : 0.0

        # Accumulate totals
        total_molar_calc = (total_molar_calc + molar_ratio_calc_mm).round(10)
        total_molar_exp = (total_molar_exp + molar_ratio_exp_mm).round(10)

        # Extract source alias (component name) from source
        source_alias = extract_component_name_from_source(source)
        
        rows_data << {
          index: index,
          source: source,
          source_alias: source_alias,
          molar_mass: molar_mass,
          weight_ratio_exp: weight_ratio_exp,
          weight_ratio_calc_processed: weight_ratio_calc_processed,
          molar_ratio_calc_mm: molar_ratio_calc_mm,
          original_molar_ratio_calc_mm: molar_ratio_calc_mm,
          original_molar_ratio_exp_mm: molar_ratio_exp_mm,
          molar_mass_state_value: molar_mass_state_value
        }
      end

      # Second pass: calculate percentages and additional columns
      rows_with_percentages = rows_data.map do |row|
        molar_ratio_calc_percent_decimal = total_molar_calc > 0 ? (row[:original_molar_ratio_calc_mm] / total_molar_calc).round(10) : 0.0
        molar_ratio_exp_percent_decimal = total_molar_exp > 0 ? (row[:original_molar_ratio_exp_mm] / total_molar_exp).round(10) : 0.0

        # Column 6: molar ratio (calc)/molar mass = weight_ratio_exp / molar_mass_state_value
        # This matches JavaScript line 84-85: weightRatioCalcMM = weight_ratio_exp / molarMassStateValue
        weight_ratio_calc_mm = nil
        if row[:molar_mass_state_value] > 0
          weight_ratio_exp = row[:weight_ratio_exp].to_f
          # Match JavaScript: parseFloat((weightRatioExp / row.molarMassStateValue).toFixed(10))
          weight_ratio_calc_mm = (weight_ratio_exp / row[:molar_mass_state_value]).round(10)
        end

        # Format values with 3 decimal places (matching JavaScript toFixed(3))
        # Column 5: molarRatioCalcMM = weightRatioCalcProcessed / molarMassStateValue (JavaScript line 37-39, 59)
        # Column 6: weightRatioCalcMM = weight_ratio_exp / molarMassStateValue (JavaScript line 84-85)
        {
          **row,
          molar_ratio_calc_percent: total_molar_calc > 0 ? molar_ratio_calc_percent_decimal.round(3) : '-',
          molar_ratio_exp_percent: total_molar_exp > 0 ? molar_ratio_exp_percent_decimal.round(3) : '-',
          molar_ratio_calc_mm: (row[:molar_ratio_calc_mm] || 0.0).round(3), # Column 5: weight ratio (calc)/molar mass
          weight_ratio_calc_mm: weight_ratio_calc_mm ? weight_ratio_calc_mm.round(3) : nil # Column 6: molar ratio (calc)/molar mass
        }
      end

      # Sort by weight ratio calc (smallest on top)
      sorted_rows = rows_with_percentages.sort_by { |row| row[:weight_ratio_calc_processed] || 0 }

      # Convert to component-like format for export
      # Only include the 8 values displayed in the composition table (matching JavaScript exactly):
      # 1. sourceAlias, 2. weight_ratio_exp, 3. molar_mass, 4. weightRatioCalcProcessed,
      # 5. molarRatioCalcMM, 6. weightRatioCalcMM, 7. molarRatioExpPercent, 8. molarRatioCalcPercent
      # Match JavaScript behavior: molarRatioCalcMM can be 0.0, weightRatioCalcMM can be null
      sorted_rows.map do |row|
        {
          'sourceAlias' => row[:source_alias] || row[:source] || '',
          'weight_ratio_exp' => row[:weight_ratio_exp] || 0.0,
          'molar_mass' => row[:molar_mass] || 0.0,
          'weightRatioCalcProcessed' => row[:weight_ratio_calc_processed] || 0.0,
          'molarRatioCalcMM' => row[:molar_ratio_calc_mm] || 0.0, # JavaScript: can be 0.0 if undefined/null
          'weightRatioCalcMM' => row[:weight_ratio_calc_mm], # JavaScript: can be null
          'molarRatioExpPercent' => row[:molar_ratio_exp_percent] || '-',
          'molarRatioCalcPercent' => row[:molar_ratio_calc_percent] || '-'
        }
      end
    end

    # Parses component source to extract weight ratio (similar to parseComponentSource in Component.js)
    def parse_component_source_weight_ratio(source)
      return 0.0 if source.blank?

      if source.include?('%')
        match = source.strip.match(/^\d+/)
        match ? match[0].to_f : 0.0
      else
        0.0
      end
    end

    # Extracts component name from source (similar to parseComponentSource)
    def extract_component_name_from_source(source)
      return '' if source.blank?

      if source.include?('%')
        source.strip
      else
        parts = source.split('-')
        parts[1] || source
      end
    end

    # Calculates weight ratio without weight (similar to calcWeightRatioWithoutWeight)
    def calc_weight_ratio_without_weight(components)
      sum = 0.0
      components.each do |item|
        component_props = item['component_properties'] || {}
        source = component_props['source'] || ''
        weight_ratio_calc = parse_component_source_weight_ratio(source)
        sum += weight_ratio_calc unless weight_ratio_calc.nan?
      end
      100.0 - sum
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
  end
end
