module Report
  module Docx
    class Equation
      attr_accessor :obj, :svg_data
      def initialize(args)
        @obj = args[:obj]
        @format = args[:format] || 'png'
      end

      def generate
        img = Sablon::Image.create_by_path(img_path)
        ole = Sablon::Ole.create_by_path(ole_path)
        Sablon::Chem.create(ole, img)
      end

      def generate_products
        is_product_only = true
        img = Sablon::Image.create_by_path(img_path(is_product_only))
        ole = Sablon::Ole.create_by_path(ole_path)
        Sablon::Chem.create(ole, img)
      end

      private
      def ole_path
        OleCreator.new(obj: obj).path
      end

      def set_svg
        @svg_data = SVG::ReactionComposer.new(materials_svg_paths,
                                              solvents: solvents,
                                              temperature: temperature_svg_paths,
                                              is_report: true).compose_reaction_svg
      end

      def set_product_svg
        @svg_data = SVG::ProductsComposer.new(materials_svg_paths,
                                              is_report: true).compose_svg
      end

      def img_path(is_product_only = false)
        is_product_only ? set_product_svg : set_svg
        unless svg_data.nil?
          svg_path = generate_svg_file_path
          output_path = generate_ouput_file_path
          inkscape_convert(svg_path, output_path)
          return output_path
        else
          raise "Fehler: Kein Bild angegeben"
        end
      end

      def generate_svg_file_path
        svg_file = Tempfile.new(['equation', '.svg'])
        File.open(svg_file.path, 'w') { |file| file.write(svg_data) }
        svg_file.path
      end

      def generate_ouput_file_path
        output_file = Tempfile.new(['equation', ".#{@format}"])
        File.open(output_file.path, 'w')
        output_file.path
      end

      def inkscape_convert(input, output)
        system "inkscape --export-text-to-path --without-gui --file=#{input} --export-#{@format}=#{output} --export-width=1550 --export-height=440"
      end

      def materials_svg_paths
        paths = {}
        paths[:starting_materials] = obj.starting_materials.map(&:get_svg_path)
        paths[:reactants] = obj.reactants.map(&:get_svg_path)
        paths[:products] = obj.products.map do |p|
          yield_amount = ReactionsProductSample.find_by(reaction_id: obj.id, sample_id: p.id).equivalent
          [p.get_svg_path, yield_amount]
        end
        return paths
      end

      def solvents
        obj.solvents.present? ? obj.solvents.map{ |s| s.preferred_tag } : [obj.solvent]
      end

      def temperature_svg_paths
        [obj.temperature_display_with_unit].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
