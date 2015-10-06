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
      @template = <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="#{width}" height="100" viewBox="0 0 #{width} 100" style=" position: absolute; height: 100%; max-height: 200px; width: 100%;">
        <title>Reaction 1</title>
      END
      @plus = <<-END
        <svg font-family="sans-serif" stroke="rgb(0,0,0)" stroke-width="2" stroke-linecap="round">
          <line x1="0" y1="100" x2="50" y2="100"/>
          <line x1="25" y1="75" x2="25" y2="125"/>
        </svg>
      END
      @arrow = <<-END
        <svg font-family="sans-serif" stroke="rgb(0,0,0)" stroke-width="1" stroke-linecap="round">
          <line x1="0" y1="50" x2="#{arrow_width}" y2="50"/>
          <line x1="#{arrow_width}" y1="50" x2="#{arrow_width - 10}" y2="40"/>
          <line x1="#{arrow_width}" y1="50" x2="#{arrow_width - 10}" y2="60"/>
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
        materials[:starting_materials] = @starting_materials.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0)'>" + content + "</g>"
          shift += 100
          output
        end
        materials[:arrow] = "<g transform='translate(#{shift},0)'>" + @arrow + "</g>"
        if (@reactants.size == 0 && @starting_materials.size != 0)
          shift += 50
        end
        materials[:reactants] = @reactants.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0) scale(0.5)'>" + content + "</g>"
          shift += 50
          output
        end
        materials[:products] = @products.map do |material|
          output = "<g transform='translate(#{shift}, 0)'>" + innerFileContent(material).to_s + "</g>"
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
