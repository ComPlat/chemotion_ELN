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

      private
      def png
        Sablon::Image.create_by_path(png_path)
      end

      def set_svg
        @svg_file = SVG::ReactionComposer.new(materials_svg_paths,
                                              solvent: solvent_svg_paths,
                                              temperature: temperature_svg_paths).compose_reaction_svg
      end

      def png_path
        set_svg
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
        paths[:products] = obj.products.map(&:get_svg_path)
        return paths
      end

      def solvent_svg_paths
        [obj.solvent].reject{|c| c.blank?}.join(", ")
      end

      def temperature_svg_paths
        [obj.temperature].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
