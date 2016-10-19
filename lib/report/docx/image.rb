module Report
  module Docx
    class Image
      attr_accessor :obj, :svg_file
      def initialize(args)
        @obj = args[:obj]
        @svg_file = args.fetch(:svg_file, nil)
      end

      def generate_png
        png
      end

      def generate_product_png
        product_png
      end

      private
      def png
        Sablon::Image.create_by_path(png_path)
      end

      def product_png
        is_product_only = true
        Sablon::Image.create_by_path(png_path(is_product_only))
      end

      def set_svg
        @svg_file = SVG::ReactionComposer.new(materials_svg_paths,
                                              solvents: solvents,
                                              temperature: temperature_svg_paths,
                                              is_report: true).compose_reaction_svg
      end

      def set_product_svg
        @svg_file = SVG::ProductsComposer.new(materials_svg_paths,
                                              is_report: true).compose_svg
      end

      def png_path(is_product_only = false)
        is_product_only ? set_product_svg : set_svg
        unless svg_file.nil?
          file = Tempfile.new(['image', '.png'])
          svg_to_img("png").write_to_png(file.path)
          return file.path
        else
          raise "Fehler: Kein Bild angegeben"
        end
      end

      def svg_to_img(type)
        Svg2pdf.convert_to_img_data(svg_file, type.to_sym)
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
        [obj.temperature_display].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
