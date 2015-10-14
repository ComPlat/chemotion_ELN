require 'nokogiri'
require 'digest'

module SVG
  class ReactionComposer

    def initialize(materialsInchikeys, options = {})
      @svg_path = File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'molecules')
      @starting_materials = materialsInchikeys[:starting_materials]
      @reactants = materialsInchikeys[:reactants]
      @products = materialsInchikeys[:products]
      number_of_reactants = (@reactants.size == 0 && @starting_materials.size != 0) ? 1 : @reactants.size
      @arrow_width = number_of_reactants * 50 + 60
      width = (@starting_materials.size + @products.size) * 100 + @arrow_width
      @label = options[:label]

      @template = <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="#{2*width}px" height="200px" viewBox="0 0 #{width} 100">
        <title>Reaction 1</title>
      END
      @labels = <<-END
        <svg font-family="sans-serif" font-size="8">
          <text text-anchor="middle" x="#{@arrow_width / 2}" y="65">#{@label}</text>
        </svg>
      END
      @divider = <<-END
      <svg font-family="sans-serif" font-size="14">
          <text x="0" y="50">+</text>
      </svg>
      END
      @arrow = <<-END
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="50" x2="#{@arrow_width}" y2="50"/>
          <polygon points="#{@arrow_width - 8},50 #{@arrow_width - 10},47 #{@arrow_width},50 #{@arrow_width - 10},53"/>
        </svg>
      END
    end

    def compose_reaction_svg_and_save(options = {})
      prefix = (options[:temp]) ? "temp-" : ""
      svg = compose_reaction_svg
      file_name = prefix + generate_filename
      File.open(file_path + "/" + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def compose_reaction_svg
      @template.strip + sections.values.flatten.map(&:strip).join + "</svg>"
    end

    def file_path
      File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions')
    end

    private

      def innerFileContent fileName
        file = File.join(@svg_path, fileName + '.svg')
        doc = Nokogiri::XML(File.open(file))
        doc.css("g svg")
      end

      def compose_material_group( material_group, options = {} )
        shift = options[:start_at]
        material_width = options[:material_width]
        scale = options[:scale] || 1
        divider = ''
        material_group.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0) scale(#{scale})'>" + content + "</g>" + divider
          divider = "<g transform='translate(#{shift + material_width}, 0) scale(#{scale})'>" + @divider + "</g>"
          shift += material_width
          output
        end
      end

      def compose_arrow_and_reaction_labels( options = {} )
        shift = options[:start_at]
        output = "<g transform='translate(#{shift}, 0)'>" + @arrow + "</g>"
        output += "<g transform='translate(#{shift}, 0)'>" + @labels + "</g>"
        output
      end

      def sections
        sections = {}
        starting_materials_length = @starting_materials.length * 100
        sections[:starting_materials] = compose_material_group @starting_materials, {start_at: 0, material_width: 100}
        sections[:reactants] = compose_material_group @reactants, start_at: starting_materials_length + 30, material_width: 50, scale: 0.5
        sections[:arrow] = compose_arrow_and_reaction_labels start_at: starting_materials_length
        sections[:products] = compose_material_group @products, start_at: starting_materials_length + @arrow_width, material_width: 100
        sections
      end

      def generate_filename
        inchikeys = {:starting_materials => @starting_materials, :reactants => @reactants, :products => @products}
        key_base = "#{inchikeys.to_a.flatten.join}#{@label}"
        hash_of_inchikeys = Digest::SHA256.hexdigest(key_base)
        hash_of_inchikeys + '.svg'
      end


  end
end
