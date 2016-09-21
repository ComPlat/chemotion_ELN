require 'nokogiri'
require 'digest'

module SVG
  class ReactionComposer

    def initialize(materials_svg_paths, options = {})
      @svg_path = File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'molecules')
      @starting_materials = materials_svg_paths[:starting_materials] || []
      @reactants = materials_svg_paths[:reactants] || []
      @products = materials_svg_paths[:products] || []
      number_of_reactants = (@reactants.size == 0 && @starting_materials.size != 0) ? 1 : @reactants.size
      number_of_starting_materials = @starting_materials.size
      number_of_products = @products.size
      is_report = options[:is_report]
      @min_material_width = 65535 # just a very big number
      @max_material_width = 0 # just a very big number
      @word_size = is_report ? 4 + (number_of_reactants + number_of_starting_materials + number_of_products) : 8
      @arrow_width = number_of_reactants * 50 + 60
      width = (@starting_materials.size + @products.size) * 100 + @arrow_width
      @solvents = options[:solvents] || []
      @temperature = options[:temperature]
      @arrow_y_shift = @solvents.count > 3 ? (@solvents.count - 3) * 4 : 0

      @template = <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="12in" height="3.33in" viewBox="0 0 #{width} 110">
        <title>Reaction 1</title>
      END
      @label_temperature = <<-END
        <svg font-family="sans-serif">
          <text text-anchor="middle" x="#{@arrow_width / 2}" y="#{65 - @arrow_y_shift}" font-size="#{@word_size + 1}">#{@temperature}</text>
        </svg>
      END
      @divider = <<-END
      <svg font-family="sans-serif" font-size="14">
          <text x="0" y="50">+</text>
      </svg>
      END
      @arrow = <<-END
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="#{50 - @arrow_y_shift}" x2="#{@arrow_width}" y2="#{50 - @arrow_y_shift}" stroke="black"/>
          <polygon points="#{@arrow_width - 8},#{50 - @arrow_y_shift} #{@arrow_width - 10},#{47 - @arrow_y_shift} #{@arrow_width},#{50 - @arrow_y_shift} #{@arrow_width - 10},#{53 - @arrow_y_shift}"/>
        </svg>
      END

      @label_solvents = solvents_lines.map.with_index do |solvent, index|
        <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" x="#{@arrow_width / 2}" y="#{80 + index * 12  - @arrow_y_shift}" font-size="#{@word_size - 1}">#{solvent}</text>
          </svg>
        END
      end.join("  ")
    end

    def solvents_lines
      group_of_three = @solvents.each_slice(3).to_a
      group_of_three.map do |i|
        i.map{ |j| j[0..7] }
      end.map{ |k| k.join(" / ") }
    end

    def compose_reaction_svg_and_save(options = {})
      prefix = (options[:temp]) ? "temp-" : ""
      find_extremum_material_width
      svg = compose_reaction_svg
      file_name = prefix + generate_filename
      File.open(file_path + "/" + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def find_extremum_material_width
      (@starting_materials + @reactants + @products).flatten.each do |m|
        material, yield_amount = separate_material_yield(m)
        content = inner_file_content(material).to_s
        doc = Nokogiri::XML(content)
        w = (doc.at_css('svg')['width'] || 0).to_f
        if w < @min_material_width
          @min_material_width = w
        end
        if w > @max_material_width
          @max_material_width = w
        end
      end
    end

    def compose_reaction_svg
      @template.strip + sections.values.flatten.map(&:strip).join + "</svg>"
    end

    def file_path
      File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions')
    end

    private

      def inner_file_content svg_path
        file = "#{Rails.root}/public#{svg_path}"
        doc = Nokogiri::XML(File.open(file))
        if(svg_path.include? '/samples')
          doc.css("svg")
        else
          doc.css("g svg")
        end
      end

      def compose_material_group( material_group, options = {} )
        shift = options[:start_at]
        material_width = options[:material_width]
        scale = options[:scale] || 1
        divider = ''
        material_group.map do |m|
          material, yield_amount = separate_material_yield(m)
          yield_svg = yield_amount ? compose_yield_svg(yield_amount) : ""

          content = inner_file_content(material).to_s
          doc = Nokogiri::XML(content)
          svg = doc.at_css('svg')
          svg['style'] += " vertical-align\: top\;"
          svg['style'] += " width\: #{material_width}px\;"
          svg['style'] += " max-height\: 90px\;"
          current_width = (svg['width'] || 1).to_f
          scale *= material_width / current_width

          if current_width != @max_material_width
            scale *= 0.5 * current_width / @max_material_width
          end

          output = "<g transform='translate(#{shift}, 0) scale(#{scale})'>" + svg.to_s + yield_svg +"</g>" + divider
          divider = "<g transform='translate(#{shift + material_width}, 0) scale(#{scale})'>" + @divider + "</g>"
          shift += material_width + 10 # Add a small space between material
          output
        end
      end

      def separate_material_yield(element)
        material, material_yield = element.class == Array ? element : [element, false]
      end

      def compose_yield_svg(amount)
        yield_amount = amount && !amount.to_f.nan? ? (amount * 100).try(:round, 0) : 0
        yield_svg = <<-END
          <svg font-family="sans-serif">
            <text text-anchor="middle" font-size="#{@word_size + 1}" y="105" x="55">#{yield_amount} %</text>
          </svg>
        END
      end

      def compose_arrow_and_reaction_labels( options = {} )
        x_shift = options[:start_at]
        y_shift = options[:arrow_y_shift]
        output = "<g transform='translate(#{x_shift}, #{y_shift})'>" + @arrow + "</g>"
        output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + @label_solvents + "</g>"
        output += "<g transform='translate(#{x_shift}, #{y_shift})'>" + @label_temperature + "</g>"
        output
      end

      def sections
        sections = {}
        starting_materials_length = @starting_materials.length * 100
        sections[:starting_materials] = compose_material_group @starting_materials, {start_at: 0, material_width: 100}
        sections[:reactants] = compose_material_group @reactants, start_at: starting_materials_length + 30, material_width: 50, scale: 0.5
        sections[:arrow] = compose_arrow_and_reaction_labels start_at: starting_materials_length, arrow_y_shift: @arrow_y_shift
        sections[:products] = compose_material_group @products, start_at: starting_materials_length + @arrow_width, material_width: 100
        sections
      end

      def generate_filename
        filenames = {:starting_materials => @starting_materials, :reactants => @reactants, :products => @products}
        key_base = "#{filenames.to_a.flatten.join}#{@label_solvents}#{@temperature}"
        hash_of_filenames = Digest::SHA256.hexdigest(key_base)
        hash_of_filenames + '.svg'
      end
  end
end
