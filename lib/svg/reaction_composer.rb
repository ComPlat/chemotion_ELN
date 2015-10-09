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
      arrow_width = number_of_reactants * 50
      width = (@starting_materials.size + @products.size) * 100 + arrow_width
      labels = options[:labels]
      @template = <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="#{width}" height="100" viewBox="0 0 #{width} 100" style=" position: absolute; height: 100%; max-height: 200px; width: 100%;">
        <title>Reaction 1</title>
      END
      @labels = <<-END
        <svg font-family="sans-serif" font-size="8">
          <text text-anchor="middle" x="#{arrow_width / 2}" y="65">#{labels[:first]}</text>
          <text text-anchor="middle" x="#{arrow_width / 2}" y="75">#{labels[:second]}</text>
          <text text-anchor="middle" x="#{arrow_width / 2}" y="85">#{labels[:third]}</text>
        </svg>
      END
      @divider = <<-END
      <svg font-family="sans-serif" font-size="14">
          <text x="0" y="50">+</text>
      </svg>
      END
      @arrow = <<-END
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="50" x2="#{arrow_width}" y2="50"/>
          <polygon points="#{arrow_width - 8},50 #{arrow_width - 10},47 #{arrow_width},50 #{arrow_width - 10},53"/>
        </svg>
      END
    end

    def compose_reaction_svg_and_save(options = {})
      prefix = (options[:temp]) ? "temp-" : ""
      svg = compose_reaction_svg
      file_name = prefix + generateFilename
      File.open(file_path + "/" + file_name, 'w') { |file| file.write(svg) }
      file_name
    end

    def compose_reaction_svg
      @template + materialGroups.values.join + "</svg>"
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

      def materialGroups
        materials = {}
        shift = 0
        divider = ""
        materials[:starting_materials] = @starting_materials.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0)'>" + content + "</g>" + divider
          divider = "<g transform='translate(#{shift + 100}, 0)'>" + @divider + "</g>"
          shift += 100
          output
        end
        materials[:arrow] = "<g transform='translate(#{shift}, 0)'>" + @arrow + "</g>"
        materials[:labels] = "<g transform='translate(#{shift}, 0)'>" + @labels + "</g>"
        if (@reactants.size == 0 && @starting_materials.size != 0)
          shift += 50
        end
        divider = ""
        materials[:reactants] = @reactants.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0) scale(0.5)'>" + content + "</g>" + divider
          divider = "<g transform='translate(#{shift + 50}, 0) scale(0.5)'>" + @divider + "</g>"
          shift += 50
          output
        end
        divider = ""
        materials[:products] = @products.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0)'>" + content + "</g>" + divider
          divider = "<g transform='translate(#{shift + 100}, 0)'>" + @divider + "</g>"
          shift += 100
          output
        end
        materials
      end

      def generateFilename
        inchikeys = {:starting_materials => @starting_materials, :reactants => @reactants, :products => @products}
        hash_of_inchikeys = Digest::SHA256.hexdigest(inchikeys.values.join)
        hash_of_inchikeys + '.svg'
      end


  end
end
