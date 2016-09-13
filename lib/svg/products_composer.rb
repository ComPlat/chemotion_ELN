require 'nokogiri'
require 'digest'

module SVG
  class ProductsComposer

    def initialize(materials_svg_paths, options = {})
      @svg_path = File.join(File.dirname(__FILE__), '..', '..', 'public', 'images', 'molecules')
      @products = materials_svg_paths[:products] || []
      number_of_products = @products.size
      is_report = options[:is_report]
      @word_size = is_report ? 4 + 2 * number_of_products : 8
      width = @products.size * 100

      @template = <<-END
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:cml="http://www.xml-cml.org/schema"
          width="12in" height="3.33in" viewBox="0 0 #{width} 110">
        <title>Reaction 1</title>
      END
    end

    def compose_svg
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
        shift = options[:start_at] || 0
        material_width = options[:material_width] || 0
        scale = options[:scale] || 1
        divider = ''
        material_group.map do |m|
          material, yield_amount = separate_material_yield(m)
          yield_svg = yield_amount ? compose_yield_svg(yield_amount) : ""

          content = inner_file_content(material).to_s
          output = "<g transform='translate(#{shift}, 0) scale(#{scale})'>" + content + yield_svg +"</g>"
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
            <text text-anchor="middle" font-size="#{@word_size + 1}" y="100" x="55">#{yield_amount} %</text>
          </svg>
        END
      end

      def sections
        sections = {}
        sections[:products] = compose_material_group(@products, material_width: 100)
        sections
      end

      def generate_filename
        filenames = {:products => @products}
        key_base = "#{filenames.to_a.flatten.join}"
        hash_of_filenames = Digest::SHA256.hexdigest(key_base)
        hash_of_filenames + '.svg'
      end
  end
end
