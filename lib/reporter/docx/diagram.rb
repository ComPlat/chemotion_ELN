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

      private

      def img_path(products_only = false)
        load_svg_paths
        set_svg(products_only)
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
        svg_file = Tempfile.new(['diagram', '.svg'])
        File.open(svg_file.path, 'w') { |file| file.write(svg_data) }
        svg_file.path
      end

      def generate_ouput_file_path
        output_file = Tempfile.new(['diagram', ".#{@format}"])
        File.open(output_file.path, 'w')
        output_file.path
      end

      def inkscape_convert(input, output)
        system "inkscape --export-text-to-path --without-gui --file=#{input} --export-#{@format}=#{output} --export-width=1550 --export-height=440"
      end

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
