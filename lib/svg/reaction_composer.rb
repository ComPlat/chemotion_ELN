require 'nokogiri'
require 'digest'

module SVG
  class ReactionComposer
    REACTANT_SCALE = 0.75
    YIELD_YOFFSET = 10
    SOLVENT_LENGTH_LIMIT = 15
    CONDITION_LENGTH_LIMIT = 20
    WORD_SIZE_BASE_REPORT = 12
    WORD_SIZE_REPORT_SCALE = 2
    WORD_SIZE_BASE_SVG = 14
    WORD_SIZE_SVG_SCALE = 1.7
    ARROW_LENGTH_BASE = 120
    ARROW_LENGTH_SCALE = 50
    TIME_UNIT = {
      'se' => 'sec',
      'mi' => 'min',
      'ho' => 'hr',
      'hr' => 'hr',
      'da' => 'd',
      'we' => 'w',
      'mo' => 'm',
      'ye' => 'y'
    }.freeze

    attr_reader :starting_materials, :reactants, :products, :duration,
                :num_starting_materials, :num_reactants, :num_products,
                :is_report, :solvents, :temperature, :conditions, :pas, :word_size,
                :preserve_aspect_ratio, :arrow_width
    attr_accessor :global_view_box_array

    def initialize(materials_svg_paths, options = {})
      init_materials(materials_svg_paths)
      init_parameters(options)
      init_word_size
      init_arrow_width
      init_svg
    end

    def self.include_with_correct_order?(container, target)
      first = target.first
      index_first = container.find_index(first)
      return false if index_first.nil?

      target[1..-1].each_with_index do |val, k|
        container_idx = index_first + k + 1
        container_value = container[container_idx]
        return false unless container_value == val
      end

      true
    end

    def self.cs_reaction_svg_from_mdl(rinfo, solvents_smis)
      files = {
        starting_materials: [],
        products: [],
        solvents: [],
        reactants: []
      }

      @starting_materials = rinfo[:reactants_mdl]
      @products = rinfo[:products_mdl]
      @reactants = rinfo[:reagents_mdl]

      %w[starting_materials products].each do |g|
        svg_files = instance_variable_get("@#{g}").map do |r, _|
          mol_svg = Chemotion::OpenBabelService.mdl_to_trans_svg(r)
          tmp_file = Tempfile.new
          tmp_file.write(mol_svg)
          tmp_file.close
          tmp_file
        end

        files[g.to_sym].concat(svg_files)
      end

      reactant_svg = @reactants.map do |mdl|
        svg = Chemotion::OpenBabelService.mdl_to_trans_svg(mdl)
        tmp_file = Tempfile.new
        tmp_file.write(svg)
        tmp_file.close
        tmp_file
      end
      files[:reactants].concat(reactant_svg)

      @solvents = rinfo[:reagents_smiles] & solvents_smis
      @reactants = rinfo[:reagents_smiles] - @solvents
      smi_arr = %w[reactants solvents]
      smi_arr.each do |g|
        svg_files = instance_variable_get("@#{g}").map do |r, _|
          mol_svg = Chemotion::OpenBabelService.smi_to_trans_svg(r)
          tmp_file = Tempfile.new
          tmp_file.write(mol_svg)
          tmp_file.close
          tmp_file
        end

        files[g.to_sym].concat(svg_files)
      end

      paths = {}
      name_arr = %w[starting_materials reactants solvents products]
      name_arr.each do |g|
        paths[g.to_sym] = files[g.to_sym].map(&:to_path)
      end

      svg = new(
        paths,
        rails_path: false,
        solvents: paths[:solvents]
      ).compose_cs_reaction_svg

      name_arr.each do |g|
        files[g.to_sym].map(&:unlink)
      end

      svg
    end

    def self.reaction_svg_from_rsmi(rsmi)
      mol_arr = rsmi.split('>')
      return nil if mol_arr.size.zero?

      @starting_materials = mol_arr[0].split('.')
      @reactants = mol_arr[1].split('.')
      @products = mol_arr[2].split('.')
      name_arr = %w[starting_materials reactants products]

      files = {}
      name_arr.each do |g|
        files[g.to_sym] = instance_variable_get("@#{g}").map do |r|
          mol_svg = Chemotion::OpenBabelService.smi_to_trans_svg(r)
          tmp_file = Tempfile.new
          tmp_file.write(mol_svg)
          tmp_file.close
          tmp_file
        end
      end
      paths = {}
      name_arr.each do |g|
        paths[g.to_sym] = files[g.to_sym].map(&:to_path)
      end

      svg = new(paths, rails_path: false).compose_reaction_svg
      name_arr.each do |g|
        files[g.to_sym].map(&:unlink)
      end
      svg
    end

    def compose_reaction_svg_and_save(options = {})
      prefix = options[:temp] ? 'temp-' : ''
      svg = compose_reaction_svg
      file_name = prefix + generate_filename
      File.open(file_path + '/' + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def compose_cs_reaction_svg
      set_cr_global_view_box_height

      sections = {}
      y_center = (global_view_box_array[3] / 2).round
      sections[:starting_materials] = compose_material_group(
        starting_materials,
        start_at: 0,
        y_center: y_center
      )
      arrow_x_shift = global_view_box_array[2] += 50
      arrow_y_shift = y_center

      sections[:reactants] = compose_material_group(
        reactants,
        start_at: global_view_box_array[2],
        scale: REACTANT_SCALE,
        arrow_width: true,
        y_center: y_center - 30,
        is_reactants: true
      )

      solvent_svg = compose_solvents_below_arrow(
        solvents,
        start_at: arrow_x_shift,
        scale: REACTANT_SCALE,
        plus_center: global_view_box_array[3],
        y_center: arrow_y_shift
      )

      arrow = "<g transform='translate(#{arrow_x_shift}, #{arrow_y_shift})'>" +
              arrow_it +
              '</g>'
      arrow += solvent_svg
      sections[:arrow] = arrow

      global_view_box_array[2] += 40 # adjust arrow to products
      @max_height_for_products = find_material_max_height(products)
      sections[:products] = compose_material_group(
        products,
        start_at: global_view_box_array[2],
        y_center: y_center
      )
      @sections = sections
      "#{template_it.strip} #{sections_string_filtered} </svg></svg>"
    end

    def compose_reaction_svg
      set_global_view_box_height
      section_it
      return "#{core_template_it.strip} #{sections_string_filtered}</svg>" if @core_only

      "#{template_it.strip} #{sections_string_filtered} </svg></svg>"
    end

    private

    def init_materials(materials_svg_paths)
      @starting_materials = materials_svg_paths[:starting_materials] || []
      @reactants = materials_svg_paths[:reactants] || []
      @products = materials_svg_paths[:products] || []
      @num_starting_materials = starting_materials.size
      @num_reactants = (reactants.empty? && num_starting_materials != 0) ? 1 : reactants.size
      @num_products = products.size
    end

    def init_parameters(options)
      @is_report = options[:is_report]
      @solvents = (options[:solvents] || []).select(&:present?)
      @temperature = options[:temperature]
      @duration = options[:duration]
      @conditions = options[:conditions]
      @pas = options[:preserve_aspect_ratio]
      @show_yield = options[:show_yield]
      @box_width = options[:supporting_information] ? 2000 : 1560
      @box_height = 440
      @rails_path = options[:rails_path].nil? ? true : options[:rails_path]
      @core_only = options[:core_only].nil? ? false : options[:core_only]
    end

    def init_word_size
      num_elements = num_reactants + num_starting_materials + num_products
      report_ws = WORD_SIZE_BASE_REPORT + num_elements * WORD_SIZE_REPORT_SCALE
      svg_ws = WORD_SIZE_BASE_SVG + num_elements * WORD_SIZE_SVG_SCALE
      @word_size = is_report ? report_ws : svg_ws
    end

    def init_arrow_width
      @arrow_width = num_reactants * ARROW_LENGTH_SCALE + ARROW_LENGTH_BASE
      scl = (((solvents || []) + (conditions || '').split("\n"))&.max_by(&:length)&.length || 1) * 12
      @arrow_width = [@arrow_width, scl].max
    end

    def init_svg
      @preserve_aspect_ratio = pas&.match(/(\w| )+/) && "preserveAspectRatio = #{$1}" || ''
      @global_view_box_array = [0, 0, 50, 50]
    end
    
    # check the length of each solvent and decide how many solv. per line according to solv.length and reactants.size
    def actual_solvents_lines
      solv_lines = [] 
      i = 0
      solvents.each_with_index do |solvent, i|
        solv_str_sum = 0
        solv_str_pre = 0
        solv_line_str = ""
        arr_length =  solv_lines.length 

        # string of solvent line which to be added to next line (array[index]) in solv_lines array
        !(i == 0) ? solv_line_str = "#{solv_lines[arr_length-1]} / #{solvents[i]}"  : solv_line_str = ""
        solv_str_sum += (solv_line_str).length

        !(i == 0) ? solv_str_pre = ((solv_lines[arr_length-1]).to_s).length : 0 

        define_singleton_method(:push_to_solv_lines) do
          solv_lines.push(solvents[i])
        end

        define_singleton_method(:modify_solv_lines_prev) do 
          solv_lines[arr_length-1] = solv_line_str
        end 

        i == 0 || reactants.size <= 1 ? push_to_solv_lines
        : ((reactants.size == 2 && solv_str_sum <= 22) || (reactants.size >= 3 && solv_str_sum <= 35) ? modify_solv_lines_prev    
        : push_to_solv_lines)
      end
      solv_lines
    end

    def template_it
      <<~XML
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="#{@box_width}" height="#{@box_height}" >
          <rect  width="#{@box_width}" height="#{@box_height}" stroke-width="1" stroke="white" fill="none"/>
          <svg width="100%" #{preserve_aspect_ratio} viewBox="#{global_view_box_array.join(' ')}" >
          <title>Reaction 1</title>
      XML
    end

    def core_template_it
      <<~XML
        <svg width="100%" #{preserve_aspect_ratio} viewBox="#{global_view_box_array.join(' ')}" >
      XML
    end

    def temperature_duration_it
      darray = duration&.match(/(\d+.?\d*)\s+(\w{2})/)
      show_duration = darray.present? ? "#{darray[1]} #{TIME_UNIT[darray[2].downcase]}" : nil

      tmdu = if show_duration.blank?
               temperature
             elsif temperature.blank?
               show_duration
             else
               "#{temperature}, #{show_duration}"
             end
      return nil if tmdu.blank?

      <<~XML
        <svg font-family="sans-serif">
          <text text-anchor="middle" x="#{arrow_width / 2}" y="30" font-size="#{word_size + 2}">#{tmdu}</text>
        </svg>
      XML
    end

    def conditions_it
      y_init = 55
      y_init += (actual_solvents_lines.size).ceil * 26 if solvents.present?
      return nil if conditions.blank?

      s_conditions = conditions.split("\n") || []
      s_conditions.map.with_index do |condition, index|
        <<~XML
          <svg font-family="sans-serif">
            <text text-anchor="middle" x="#{arrow_width / 2}" y="#{y_init + index * 25}" font-size="#{word_size}">#{condition}</text>
          </svg>
        XML
      end.join(' ')
    end

    def solvent_it
      return nil if solvents.blank?
      (actual_solvents_lines || solvents).map.with_index do |solvent, index|
        <<~XML
          <svg font-family="sans-serif">
            <text text-anchor="middle" x="#{arrow_width / 2}" y="#{55 + index * 25}" font-size="#{word_size}">#{solvent}</text>
          </svg>
        XML
      end.join('  ')
    end

    def arrow_it
      <<~XML
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="4" x2="#{arrow_width}" y2="4" stroke="black"/>
          <polygon points="#{arrow_width - 8},4 #{arrow_width - 10},7 #{arrow_width},4 #{arrow_width - 10},1"/>
        </svg>
      XML
    end

    # position the plus sign between reactants/products/starting materials in the reaction 
    def divide_it(x = 0, y =0)
      <<~XML
        <svg font-family="sans-serif" font-size="33">
            <text x="#{x}" y="#{y+16}">+</text>
        </svg>
      XML
    end

    def find_material_max_height(materials = (starting_materials + reactants + products))
      max = 0
      materials.each do |m|
        material, = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg && svg['viewBox']&.split(/\s+/)&.map(&:to_i) || [0, 0, 0, 0]
        max < vb[3] && (max = vb[3])
      end
      max
    end

    # assign height scale for condition lines
    def find_cond_max_height 
      conditions_arr = conditions.split("\n") || []
      conditions_arr.length * 75
    end

    # assign height scale for solvent lines
    def find_solvent_max_height
      (actual_solvents_lines.length)* 75
    end

    # sum of conditions and solvents height scale
    def count_height_solv_conditions
      find_solvent_max_height() + find_cond_max_height()
    end 

    def set_global_view_box_height
      material_max = find_material_max_height(starting_materials + products)
      @reactant_max = find_material_max_height(reactants)
      @max_of_solv_conditions = count_height_solv_conditions()
      global_view_box_array[3] = [@reactant_max * 2.5 , @max_of_solv_conditions, material_max, global_view_box_array[3]].max + 2 * YIELD_YOFFSET + 15
    end

    def set_cr_global_view_box_height
      material_max = find_material_max_height(starting_materials + products)
      reactant_max = find_material_max_height(reactants)
      solvent_max = find_material_max_height(solvents)

      global_view_box_array[3] = [
        reactant_max * REACTANT_SCALE * 2,
        solvent_max * REACTANT_SCALE * 2,
        material_max,
        global_view_box_array[3]
      ].max + 2 * YIELD_YOFFSET + 15
    end

    def file_path
      File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions')
    end

    def inner_file_content(svg_path)
      file = @rails_path ? "#{Rails.public_path}#{svg_path}" : svg_path
      return svg_text(svg_path) if svg_path.start_with?('svg_text/')
      return if File.directory?(file)

      doc = Nokogiri::XML(File.open(file))
      if svg_path.include?('/samples')
        doc.at_css('svg')
      else
        doc.at_css('g svg')
      end
    end

    def svg_text(path)
      text = path.split(%r{^svg_text\/})[1]
      text = text[0, 56] + '...' if text.length > 60
      text_lines = text.scan(/.{1,20}/).map do |text_line|
        "<tspan x=\"0\" dy=\"1.15em\">#{text_line}</tspan>"
      end

      content = <<~HEREDOC
        <?xml version="1.0"?>
        <svg xmlns="http://www.w3.org/2000/svg" height="80.00161338000004" version="1.1" width="138.56508078000002" style="overflow: hidden; position: relative;" viewBox="0 0 100 100">
          <g transform="translate(-15, 0)">
            <text x="10" alignment-baseline="central" y="#{(40 - text_lines.size * 10)}" font-size="1.8em">
              #{text_lines.join}
            </text>
          </g>
        </svg>
      HEREDOC

      text_file = Tempfile.new
      text_file.write content
      text_file.close

      Nokogiri::XML(File.open(text_file.path)).at_css('svg')
    end

    def compose_solvents_below_arrow(solvent_group, options = {})
      x_shift = options[:start_at] || 0
      start_x = x_shift
      y_center = options[:y_center] || 0
      plus_center = options[:plus_center] || y_center
      scale = options[:scale] || 1
      output = ''
      group_width = 0
      solvent_group.map.with_index do |m, ind|
        if ind.positive?
          group_width += 10
          output += divide_it(group_width, plus_center)
          group_width += 50
        end

        material, = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg['viewBox']&.split(/\s+/)&.map(&:to_i) || []
        unless vb.empty?
          x_shift = group_width + 10 - vb[0]
          y_shift = (y_center + vb[3] / 2).round
          group_width += vb[2] + 10
          svg['width'] = "#{vb[2]}px;"
          svg['height'] = "#{vb[3]}px;"
          output += "<g transform='translate(#{x_shift}, #{y_shift})'>" +
                    svg.inner_html.to_s +
                    '</g>'
        end
      end

      hold = output
      output = "<g transform='translate(#{start_x + 30}, 0)'>"
      output += "<g transform='scale(#{scale})'>#{hold}</g></g>"
      scaled_group_width = (group_width * scale).round
      sw = [scaled_group_width, 50].max + 80
      if sw > @arrow_width
        gvba = global_view_box_array[2]
        gvba += (sw - @arrow_width)
        global_view_box_array[2] = gvba

        @arrow_width = sw
      end

      output
    end

    def compose_material_group(material_group, **options)
      gvba = global_view_box_array
      w0 = gvba[2]
      x_shift = options[:start_at] || 0
      y_center = options[:y_center] || 0
      scale = options[:scale] || 1
      output = ''
      vb_middle = gvba[3] / 2.round
      group_width = 0
      material_group.map.with_index do |m, ind|
        if ind.positive?
          group_width += 50
          output += divide_it(group_width, y_center)
          group_width += 80
        end
        material, yield_amount = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg && svg['viewBox']&.split(/\s+/)&.map(&:to_i) || []
        unless vb.empty?
          x_shift = group_width + 10 - vb[0]
          y_shift = (y_center - vb[3] / 2).round
          yield_svg = ''
          yield_svg += compose_yield_svg(yield_amount, (vb[2] / 2).round, ((@max_height_for_products + vb[3]) / 2).round) if yield_amount
          group_width += vb[2] + 10
          svg['width'] = "#{vb[2]}px;"
          svg['height'] = "#{vb[3]}px;"

          output += "<g transform='translate(#{x_shift}, #{y_shift})'> #{svg.inner_html}"
          output += yield_svg if @show_yield
          output += '</g>'
        end
      end
      reactant_shift = options[:is_reactants] ? 30 : 0
      output = "<g transform='translate(#{gvba[2] + reactant_shift}, 0)'><g transform='scale(#{scale})'> #{output} </g></g>"
      scaled_group_width = (group_width * scale).round

      if options[:arrow_width]
        @arrow_width = [([scaled_group_width, 50].max + 80), @arrow_width].max
        gvba[2] += arrow_width
      else
        gvba[2] += scaled_group_width
      end
      global_view_box_array = gvba
      output
    end

    def separate_material_yield(element)
      element.class == Array ? element : [element, false]
    end

    def compose_yield_svg(amount, x = 0, y = @max_height_for_products)
      yield_amount = amount && !amount.to_f.nan? && !amount.to_f.infinite? ? (amount * 100).try(:round, 0) : 0
      <<~XML
        <svg font-family="sans-serif">
          <text text-anchor="middle" font-size="#{word_size + 1}" y="#{y.to_f + YIELD_YOFFSET}" x="#{x}">#{yield_amount}%</text>
        </svg>
      XML
    end

    def compose_arrow_and_reaction_labels(options = {})
      x_shift = options[:start_at]
      y_shift = options[:arrow_y_shift]
      [arrow_it, conditions_it, solvent_it, temperature_duration_it].reduce('') do |acc, it|
        it.present? ? "#{acc} <g transform='translate(#{x_shift}, #{y_shift})'> #{it} </g>" : acc
      end
    end
    
    # sum of conditions and solvents array length
    def solv_conditions_length
      (find_solvent_max_height + find_cond_max_height) / 75
    end 

    #  correcting scale for reactants size when solv_condi arr is max and @reactant_max > 300
    def adjust_reactants_range
      max = 300
      count = 0
      range = 50 
      
      until @reactant_max <= max 
        max += 100 
        count += 1
      end
      range * count 
    end 

    # correcting scale when material(> 400) is larger than reactants and solv_condi array
    def material_scale
      material_max = find_material_max_height(starting_materials + products)
      scale = material_max/400
      scale > 1 ? (material_max - 400)/(4 * scale) : 0
    end 

    # adjusting y position of reactants when there is solvents/conditions lines below reaction arrow - deduct solv_height (range) from box height so that it does not affect reactants position
    def reactants_solv_interaction
      solv_conditions_length = (find_solvent_max_height + find_cond_max_height) / 75
      y_center = (global_view_box_array[3]/ 2).round 
      solv_range = (y_center - 90) + (solv_conditions_length - 3) * 12.2
      @reactant_max <= 300 && @max_of_solv_conditions != 0 ? solv_range
      : solv_range - adjust_reactants_range 
    end 

    def check_case
      material_max = find_material_max_height(starting_materials + products)
      reactant_solv_condi_max = [@reactant_max * 2.5, @max_of_solv_conditions].max 
      y_center = (global_view_box_array[3]/ 2).round 
      y_center_scale = @reactant_max <= 140 ? y_center : y_center - 70
      material_max > reactant_solv_condi_max ?  y_center_scale + material_scale
      : (@reactant_max  > 1100 ?  @reactant_max 
      : y_center_scale)
    end

    def section_it
      sections = {}
      y_center = (global_view_box_array[3]/ 2).round
      material_max = find_material_max_height(starting_materials + products)
      reactant_material_max = [@reactant_max * 2.5, material_max].max 
      @reactants_y_position = (@max_of_solv_conditions > reactant_material_max &&  !(reactants.blank?))  ? reactants_solv_interaction : check_case
      sections[:starting_materials] = compose_material_group(starting_materials, start_at: 0, y_center: y_center)
      arrow_x_shift = (global_view_box_array[2] += 50) # adjust starting material to arrow
      arrow_y_shift = y_center
      sections[:reactants] = compose_material_group reactants, start_at: global_view_box_array[2], scale: REACTANT_SCALE, arrow_width: true, y_center: (@reactants_y_position).round, is_reactants: true # TODO: rectify y_center for reactant
      sections[:arrow] = compose_arrow_and_reaction_labels start_at: arrow_x_shift, arrow_y_shift: arrow_y_shift
      global_view_box_array[2] += 40 # adjust arrow to products
      @max_height_for_products = find_material_max_height(products)
      sections[:products] = compose_material_group products, start_at: global_view_box_array[2], y_center: y_center
      @sections = sections
    end

    def generate_filename
      filenames = { starting_materials: starting_materials, reactants: reactants, products: products }
      key_base = "#{filenames.to_a}#{solvents}#{temperature}#{duration}#{conditions}"
      hash_of_filenames = Digest::SHA256.hexdigest(key_base)
      hash_of_filenames + '.svg'
    end

    def sections_string
      @sections.values.flatten.map(&:strip).join
    end

    def sections_string_filtered
      sections_string.gsub('R#', '').gsub("font=\'30px \"Arial\"\'", '')
    end
  end
end
