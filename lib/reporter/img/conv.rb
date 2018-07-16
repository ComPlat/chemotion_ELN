module Reporter
  module Img
    module Conv
      def self.data_to_svg(svg_data)
        svg_file = Tempfile.new(['diagram', '.svg'])
        File.open(svg_file.path, 'w') do |file| file.write(svg_data) end
        svg_file.path
      end

      def self.ext_to_path(target_ext)
        output_file = Tempfile.new(['diagram', ".#{target_ext}"])
        File.open(output_file.path, 'w')
        output_file.path
      end

      def self.by_inkscape(input, output, ext)
        system(
          'inkscape --export-text-to-path --without-gui ' \
          "--file=#{input} --export-#{ext}=#{output} " \
          '--export-width=1550 --export-height=440'
        )
      end

      def self.valid?(path)
        data = File.read(path)
        data.length > 0
      end
    end
  end
end
