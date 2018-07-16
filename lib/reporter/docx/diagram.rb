module Reporter
  module Docx
    class Diagram
      attr_accessor :obj, :svg_data, :materials_svg_paths
      def initialize(args)
        @obj = args[:obj]
        @format = args[:format] || 'png'
        @template = args[:template]
      end

      def generate(products_only = false)
        img = Sablon::Image.create_by_path(img_path(products_only))
        ole = Sablon::Ole.create_by_path(ole_path)
        Sablon::Chem.create(ole, img)
      end

      def img_path(products_only = false)
        load_svg_paths
        set_svg(products_only)
        raise 'Fehler: Kein Bild angegeben' if svg_data.nil?
        svg_path = Reporter::Img::Conv.data_to_svg(svg_data)
        out_path = Reporter::Img::Conv.ext_to_path(@format)
        Reporter::Img::Conv.by_inkscape(svg_path, out_path, @format)
        out_path
      end

      private

      def ole_path
        svg_paths_count = materials_svg_paths[:starting_materials].count +
                            materials_svg_paths[:reactants].count +
                            materials_svg_paths[:products].count
        if svg_paths_count > 0
          OleCreator.new(obj: obj).path
        else
          OleCreator.new(obj: obj).template_path
        end
      end
    end
  end
end
