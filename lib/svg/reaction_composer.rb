require 'Nokogiri'
require 'digest'
#require "awesome_print"

module SVG
  class ReactionComposer

    def initialize (starting_materials, reactants, products)
      @svg_path = File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'molecules')
      @starting_materials = starting_materials
      @reactants = reactants
      @products = products
      width = (starting_materials.size + (0.5 * reactants.size) + products.size) * 100
      arrow_width = reactants.size * 50
      @template = <<-END
        <svg version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          xmlns:cml="http://www.xml-cml.org/schema">
        <title>Reaction 1</title>
        <rect x="0" y="0" width="#{width}" height="100" fill="white"/>
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

    def compose_reaction_svg_and_save
      svg = compose_reaction_svg
      File.open(file_path, 'w') { |file| file.write(svg) }
    end

    def compose_reaction_svg
      compose_reaction_svg_document.to_xml
    end

    def compose_reaction_svg_document
      output = @template
      materialGroups.each do |materials|
        output += materials.join("")
      end
      output += '</svg>'
      Nokogiri::XML(output)
    end

    private

      def innerFileContent fileName
        file = File.join(@svg_path, fileName + '.svg')
        doc = Nokogiri::XML(File.open(file))
        doc.css("g svg")
      end

      # todo width
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
        materials[:reactants] = @reactants.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0) scale(0.5)'>" + content + "</g>"
          shift += 50
          output
        end
        materials[:products] = @products.map do |material|
          content = innerFileContent(material).to_s
          output = "<g transform='translate(#{shift}, 0)'>" + content + "</g>"
          shift += 100
          output
        end
        materials
      end

      def file_path
        File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'reactions', generateFilename)
      end

      def generateFilename
        inchikeys = {:starting_materials => @starting_materials, :reactants => @reactants, :products => @products}
        hash_of_inchikeys = Digest::SHA256.hexdigest(inchikeys.values.join)
        hash_of_inchikeys + '.svg'
      end


  end
end
