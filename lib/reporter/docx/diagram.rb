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
        path, out_tmp = img_path(products_only)
        img = Sablon::Image.create_by_path(path)
        ole = Sablon::Ole.create_by_path(ole_path)
        Sablon::Chem.create(ole, img)
      ensure
        out_tmp&.close!
      end

      # Renders the diagram to a file in the configured format by composing
      # the SVG, writing it to a temp file, and driving Inkscape.
      #
      # The returned Tempfile must be kept alive by the caller until the
      # path has been consumed — some consumers (e.g. caxlsx) defer the read
      # until package serialization. Call +close!+ on it afterwards.
      #
      # @param products_only [Boolean] when true, render only product structures
      # @return [Array(String, Tempfile)] +[path, tmp]+ — the rendered image
      #   path and its backing Tempfile
      # @raise [RuntimeError] when no SVG data is available
      def img_path(products_only = false)
        rendered = false
        load_svg_paths
        set_svg(products_only)
        raise 'Fehler: Kein Bild angegeben' if svg_data.nil?
        svg_tmp = Reporter::Img::Conv.data_to_svg(svg_data)
        out_tmp = Reporter::Img::Conv.ext_to_path(@format)
        Reporter::Img::Conv.by_inkscape(svg_tmp.path, out_tmp.path, @format)
        rendered = true
        [out_tmp.path, out_tmp]
      ensure
        svg_tmp&.close!
        out_tmp&.close! unless rendered
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
