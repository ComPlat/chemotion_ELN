require 'nokogiri'
require 'digest'

module SVG
  class ReactionComposer
    REACTANT_SCALE = 0.75
    YIELD_YOFFSET = 10
    SOLVENT_LENGTH_LIMIT = 15
    WORD_SIZE_BASE_REPORT = 12
    WORD_SIZE_REPORT_SCALE = 2
    WORD_SIZE_BASE_SVG = 14
    WORD_SIZE_SVG_SCALE = 1.7
    ARROW_LENGTH_BASE = 120
    ARROW_LENGTH_SCALE = 50

    attr_reader :starting_materials, :reactants, :products,
                :num_starting_materials, :num_reactants, :num_products,
                :is_report, :solvents, :temperature, :pas, :word_size,
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
        idx = container.find_index(val)
        return false if idx.nil? || (idx != (index_first + k + 1))
      end

      true
    end

    def self.cr_reaction_svg_from_rsmi(rsmi, solvents_smis, reagents_smis)
      mol_arr = rsmi.split('>')
      return nil if mol_arr.size.zero?

      @starting_materials = mol_arr[0].split('.')

      @solvents = []
      @reactants = []
      rs = mol_arr[1]

      unless rs.empty?
        rs_arr = rs.split('.')

        solvents_smis.each do |target|
          target_arr = target.split('.')
          check = include_with_correct_order?(rs_arr, target_arr)
          next unless check
          rs_arr -= target_arr
          @solvents.push(target_arr.join('.'))
        end

        reagents_smis.each do |target|
          target_arr = target.split('.')
          check = include_with_correct_order?(rs_arr, target_arr)
          next unless check
          rs_arr -= target_arr
          @reactants.push(target_arr.join('.'))
        end

        @solvents.reject!(&:empty?)
        @reactants.concat(rs_arr).reject!(&:empty?)
      end

      @products = mol_arr[2].split('.')
      name_arr = %w[starting_materials reactants solvents products]

      files = {}
      name_arr.each do |g|
        files[g.to_sym] = instance_variable_get("@#{g}").map { |r, _|
          mol_svg = Chemotion::OpenBabelService.smi_to_trans_svg(r)
          tmp_file = Tempfile.new
          tmp_file.write(mol_svg)
          tmp_file.close
          tmp_file
        }
      end
      paths = {}
      name_arr.each do |g|
        paths[g.to_sym] = files[g.to_sym].map(&:to_path)
      end

      svg = new(
        paths,
        rails_path: false,
        solvents: paths[:solvents]
      ).compose_cr_reaction_svg

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
        files[g.to_sym] = instance_variable_get("@#{g}").map { |r, i|
          mol_svg = Chemotion::OpenBabelService.smi_to_trans_svg(r)
          tmp_file = Tempfile.new
          tmp_file.write(mol_svg)
          tmp_file.close
          tmp_file
        }
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
      prefix = options[:temp] ? "temp-" : ""
      svg = compose_reaction_svg
      file_name = prefix + generate_filename
      File.open(file_path + "/" + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def compose_cr_reaction_svg
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
      template_it.strip + sections_string_filtered + '</svg></svg>'
    end

    def compose_reaction_svg
      set_global_view_box_height
      section_it
      template_it.strip + sections_string_filtered + "</svg></svg>"
    end

    private
      def init_materials(materials_svg_paths)
        @starting_materials = materials_svg_paths[:starting_materials] || []
        @reactants = materials_svg_paths[:reactants] || []
        @products = materials_svg_paths[:products] || []
        @num_starting_materials = starting_materials.size
        @num_reactants = (reactants.size == 0 && num_starting_materials != 0) ? 1 : reactants.size
        @num_products = products.size
      end

      def init_parameters(options)
        @is_report = options[:is_report]
        @solvents = options[:solvents] || []
        @temperature = options[:temperature]
        @pas = options[:preserve_aspect_ratio]
        @show_yield = options[:show_yield]
        @box_width = options[:supporting_information] ? 2000 : 1560
        @box_height = 440
        @rails_path = options[:rails_path].nil? ? true : options[:rails_path]
      end

      def init_word_size
        num_elements = num_reactants + num_starting_materials + num_products
        report_ws = WORD_SIZE_BASE_REPORT + num_elements * WORD_SIZE_REPORT_SCALE
        svg_ws = WORD_SIZE_BASE_SVG + num_elements * WORD_SIZE_SVG_SCALE
        @word_size = is_report ? report_ws : svg_ws
      end

      def init_arrow_width
        @arrow_width = num_reactants * ARROW_LENGTH_SCALE + ARROW_LENGTH_BASE
      end

      def init_svg
        @preserve_aspect_ratio = pas && pas.match(/(\w| )+/) && "preserveAspectRatio = #{$1}" || ''
        @global_view_box_array = [0,0,50,50]
      end

      def solvents_lines
        groups = solvents.each_slice(num_solvents_per_line).to_a
        groups.map do |g|
          solvents_string(g)
        end.map{ |k| k.join("  /  ") } unless solvents.empty?
      end

      def num_solvents_per_line
        reactants_size = reactants.size > 0 ? reactants.size : 1
        reactants_size > 3 ? 3 : reactants_size
      end

      def solvents_string(group)
        group.map do |j|
          if j && j.size > SOLVENT_LENGTH_LIMIT
            j && "#{j[0..SOLVENT_LENGTH_LIMIT-1]}.."
          elsif j
            j
          end
        end
      end

      def template_it
        <<-END
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
            width="#{@box_width}" height="#{@box_height}" >
            <rect  width="#{@box_width}" height="#{@box_height}" stroke-width="1" stroke="white" fill="none"/>
            <svg width="100%" #{preserve_aspect_ratio} viewBox="#{global_view_box_array.join(' ')}" >
            <title>Reaction 1</title>
        END
      end

      def temperature_it
        <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" x="#{arrow_width / 2}" y="30" font-size="#{word_size + 2}">#{temperature}</text>
          </svg>
        END
      end

      def solvent_it
        (solvents.size >1 && solvents_lines || solvents).map.with_index do |solvent, index|
          <<-END
            <svg font-family="sans-serif">
              <text text-anchor="middle" x="#{arrow_width / 2}" y="#{55 + index * 25}" font-size="#{word_size}">#{solvent}</text>
            </svg>
          END
        end.join("  ")
      end

      def arrow_it
        <<-END
          <svg stroke="black" stroke-width="1">
            <line x1="0" y1="4" x2="#{arrow_width}" y2="4" stroke="black"/>
            <polygon points="#{arrow_width - 8},4 #{arrow_width - 10},7 #{arrow_width},4 #{arrow_width - 10},1"/>
          </svg>
        END
      end

      def divide_it(x=0,y=0)
        <<-END
        <svg font-family="sans-serif" font-size="28">
            <text x="#{x}" y="#{y}">+</text>
        </svg>
        END
      end


      def find_material_max_height(materials=(starting_materials + reactants + products))
        max = 0
        materials.each do |m|
          material, yield_amount = *separate_material_yield(m)
          svg = inner_file_content(material)
          vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || [0,0,0,0]
          max < vb[3] && (max = vb[3])
        end
        max
      end

      def set_global_view_box_height
        material_max = find_material_max_height(starting_materials + products)
        reactant_max = find_material_max_height(reactants)
        global_view_box_array[3] = [reactant_max*REACTANT_SCALE*2,material_max, global_view_box_array[3]].max+2*YIELD_YOFFSET + 15
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
        ].max + 2 *YIELD_YOFFSET + 15
      end


      def file_path
        File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions')
      end

      def inner_file_content svg_path
        file = @rails_path ? "#{Rails.root}/public#{svg_path}" : svg_path
        doc = Nokogiri::XML(File.open(file))
        if(svg_path.include? '/samples')
          doc.at_css("svg")
        else
          doc.at_css("g svg")
        end
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
          vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || []
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

      def compose_material_group(material_group, options = {})
        gvba = global_view_box_array
        w0 = gvba[2]
        x_shift = options[:start_at] || 0
        y_center = options[:y_center] || 0
        scale = options[:scale] || 1
        output = ''
        vb_middle = gvba[3]/2.round()
        group_width = 0
        material_group.map.with_index do |m,ind|
          if ind > 0
            group_width += 10
            output += divide_it(group_width,y_center)
            group_width += 50
          end
          material, yield_amount = *separate_material_yield(m)
          svg = inner_file_content(material)
          vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || []
          unless vb.empty?
            x_shift = group_width + 10 - vb[0]
            y_shift = (y_center - vb[3]/2).round()
            yield_svg = yield_amount ? compose_yield_svg(
              yield_amount,(vb[2]/2).round,
              ((@max_height_for_products + vb[3])/2).round) : ""
            group_width += vb[2] + 10
            svg['width'] = "#{vb[2]}px;"
            svg['height'] = "#{vb[3]}px;"
            if @show_yield
              output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + svg.inner_html.to_s + yield_svg +"</g>"
            else
              output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + svg.inner_html.to_s + "</g>"
            end
          end
        end
        reactant_shift = options[:is_reactants] ? 30 : 0
        output = "<g transform='translate(#{gvba[2] + reactant_shift}, 0)'><g transform='scale(#{scale})'>" + output +"</g></g>"
        scaled_group_width = (group_width*scale).round

        if options[:arrow_width]
          @arrow_width = [scaled_group_width, 50].max + 80
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

      def compose_yield_svg(amount,x=0,y= @max_height_for_products)
        yield_amount = amount && !amount.to_f.nan? && !amount.to_f.infinite? ? (amount * 100).try(:round, 0) : 0
        yield_svg = <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" font-size="#{word_size + 1}" y="#{y.to_f+YIELD_YOFFSET}" x="#{x}">#{yield_amount}%</text>
          </svg>
        END
      end

      def compose_arrow_and_reaction_labels( options = {} )
        x_shift = options[:start_at]
        y_shift = options[:arrow_y_shift]

        output = "<g transform='translate(#{x_shift}, #{y_shift})'>" + arrow_it + "</g>"
        output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + solvent_it + "</g>"
        output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + temperature_it + "</g>"
        output
      end

      def section_it
        sections = {}
        y_center = (global_view_box_array[3]/2).round
        sections[:starting_materials] = compose_material_group(starting_materials, { start_at: 0, y_center: y_center })
        arrow_x_shift = (global_view_box_array[2]+=50)  # adjust starting material to arrow
        arrow_y_shift = y_center
        sections[:reactants] = compose_material_group reactants, { start_at: global_view_box_array[2], scale: REACTANT_SCALE , arrow_width: true, y_center: y_center - 30, is_reactants: true } #TODO rectify y_center for reactnat
        sections[:arrow] = compose_arrow_and_reaction_labels start_at: arrow_x_shift, arrow_y_shift: arrow_y_shift
        global_view_box_array[2] += 40 # adjust arrow to products
        @max_height_for_products = find_material_max_height(products)
        sections[:products] = compose_material_group products, { start_at: global_view_box_array[2], y_center: y_center }
        @sections=sections
      end

      def generate_filename
        filenames = {starting_materials: starting_materials, reactants: reactants, products: products}
        key_base = "#{filenames.to_a.flatten.join}#{solvents.join('_')}#{temperature}"
        hash_of_filenames = Digest::SHA256.hexdigest(key_base)
        hash_of_filenames + '.svg'
      end

      def sections_string
        @sections.values.flatten.map(&:strip).join
      end

      def sections_string_filtered
        sections_string.gsub("R#", "").gsub("font=\'30px \"Arial\"\'", "")
      end
  end
end
