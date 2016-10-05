require 'nokogiri'
require 'digest'

module SVG
  class ReactionComposer
    REACTANT_SCALE = 0.75
    def initialize(materials_svg_paths, options = {})
      @svg_path = File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'molecules')
      @starting_materials = materials_svg_paths[:starting_materials] || []
      @reactants = materials_svg_paths[:reactants] || []
      @products = materials_svg_paths[:products] || []
      number_of_reactants = (@reactants.size == 0 && @starting_materials.size != 0) ? 1 : @reactants.size
      number_of_starting_materials = @starting_materials.size
      number_of_products = @products.size
      is_report = options[:is_report]
      report_ws = 4 + (number_of_reactants + number_of_starting_materials + number_of_products)
      svg_ws = 6 + (number_of_reactants + number_of_starting_materials + number_of_products) * 1.7
      @word_size = is_report ? report_ws : svg_ws
      @arrow_width = number_of_reactants * 50 + 120
      @solvents = options[:solvents] || []
      @temperature = options[:temperature]
      pas = options[:preserve_aspect_ratio]
      @preserve_aspect_ratio = pas && pas.match(/(\w| )+/) && "preserveAspectRatio = #{$1}" || ''
      @global_view_box_array = [0,0,50,50]
    end

    def solvents_lines
      s_per_line = @arrow_width < 150 ? 2 : 3
      group_of_three = @solvents.each_slice(s_per_line).to_a
      group_of_three.map do |i|
        i.map{ |j| j && "#{j[0..7]}.." }
      end.map{ |k| k.join(" / ") } unless @solvents.empty?
    end

    def compose_reaction_svg_and_save(options = {})
      prefix = (options[:temp]) ? "temp-" : ""
      svg = compose_reaction_svg
      file_name = prefix + generate_filename
      File.open(file_path + "/" + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def template_it
      <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="12in" height="3.33in" #{@preserve_aspect_ratio} viewBox="#{@global_view_box_array.join(' ')}">
        <title>Reaction 1</title>
      END
    end

    def temperature_it
      <<-END
        <svg font-family="sans-serif">
          <text text-anchor="middle" x="#{@arrow_width / 2}" y="30" font-size="#{@word_size + 1}">#{@temperature}</text>
        </svg>
      END
    end

    def solvent_it
      (@solvents.size >1 && solvents_lines || @solvents).map.with_index do |solvent, index|
        <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" x="#{@arrow_width / 2}" y="#{55 + index * 20}" font-size="#{@word_size + 1}">#{solvent}</text>
          </svg>
        END
      end.join("  ")
    end

    def arrow_it
      <<-END
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="4" x2="#{@arrow_width}" y2="4" stroke="black"/>
          <polygon points="#{@arrow_width - 8},4 #{@arrow_width - 10},7 #{@arrow_width},4 #{@arrow_width - 10},1"/>
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


    def find_material_max_height
      (@starting_materials + @reactants + @products).each do |m|
        material, yield_amount = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || [0,0,0,0]
        @global_view_box_array[3] < vb[3] && (@global_view_box_array[3] = vb[3])
      end
    end

    def set_global_view_box_height
      reactant_max, material_max = 0, 0
      (@starting_materials + @products).each do |m|
        material, yield_amount = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || [0,0,0,0]
        material_max < vb[3] && (material_max = vb[3])
      end
      (@reactants).each do |m|
        material, yield_amount = *separate_material_yield(m)
        svg = inner_file_content(material)
        vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || [0,0,0,0]
        reactant_max < vb[3] && (reactant_max = vb[3])
      end
      @global_view_box_array[3] = [reactant_max*REACTANT_SCALE*2,material_max,@global_view_box_array[3]].max
    end

    def compose_reaction_svg
      set_global_view_box_height
      section_it
      template_it.strip + @sections.values.flatten.map(&:strip).join + "</svg>"
    end

    def file_path
      File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions')
    end

    private

      def inner_file_content svg_path
        file = "#{Rails.root}/public#{svg_path}"
        doc = Nokogiri::XML(File.open(file))
        if(svg_path.include? '/samples')
          doc.at_css("svg")
        else
          doc.at_css("g svg")
        end
      end

      def compose_material_group( material_group, options = {} )
        gvba = @global_view_box_array
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
            group_width += 10
          end
          material, yield_amount = *separate_material_yield(m)
          svg = inner_file_content(material)
          vb = svg['viewBox'] && svg['viewBox'].split(/\s+/).map(&:to_i) || []
          yield_svg = yield_amount ? compose_yield_svg(yield_amount,(vb[2]/2).round,vb[3]) : ""
          unless vb.empty?
            x_shift = group_width + 10 - vb[0]
            y_shift = (y_center - vb[3]/2).round()
            group_width += vb[2] + 10
            svg['width'] = "#{vb[2]}px;"
            svg['height'] = "#{vb[3]}px;"
            output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + svg.inner_html.to_s + yield_svg +"</g>"
          end
        end
        output = "<g transform='translate(#{gvba[2]}, 0)'><g transform='scale(#{scale})'>" + output +"</g></g>"
        scaled_group_width = (group_width*scale).round

        if options[:arrow_width]
          @arrow_width = [scaled_group_width, 50].max + 20
          gvba[2] += @arrow_width
        else
          gvba[2] += scaled_group_width
        end
        @global_view_box_array = gvba
        output
      end


      def separate_material_yield(element)
        element.class == Array ? element : [element, false]
      end

      def compose_yield_svg(amount,x=0,y=0)
        yield_amount = amount && !amount.to_f.nan? ? (amount * 100).try(:round, 0) : 0
        yield_svg = <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" font-size="#{@word_size + 1}" y="#{y}" x="#{x}">#{yield_amount} %</text>
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

      def section_it()
        sections = {}
        y_center = (@global_view_box_array[3]/2).round
        sections[:starting_materials] = compose_material_group @starting_materials, { start_at: 0, y_center: y_center }
        arrow_x_shift = (@global_view_box_array[2]+=50)  # adjust starting material to arrow
        arrow_y_shift = y_center
        sections[:reactants] = compose_material_group @reactants, start_at: @global_view_box_array[2], scale: REACTANT_SCALE , arrow_width: true,y_center: y_center - 30 #TODO rectify y_center for reactnat
        sections[:arrow] = compose_arrow_and_reaction_labels start_at: arrow_x_shift, arrow_y_shift: arrow_y_shift
        @global_view_box_array[2] += 40 # adjust arrow to products
        sections[:products] = compose_material_group @products, { start_at: @global_view_box_array[2], y_center: y_center }
        @sections=sections
      end

      def generate_filename
        filenames = {:starting_materials => @starting_materials, :reactants => @reactants, :products => @products}
        key_base = "#{filenames.to_a.flatten.join}#{@solvents.join('_')}#{@temperature}"
        hash_of_filenames = Digest::SHA256.hexdigest(key_base)
        hash_of_filenames + '.svg'
      end
  end
end
