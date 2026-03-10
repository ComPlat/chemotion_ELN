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

      def self.by_inkscape(input, output, ext, width: 1550, height: 440)
        # Inkscape 1.x: --export-type and --export-filename (or -o)
        # --export-area-drawing exports the content bounds (avoids black PNG when page/viewBox is off)
        args_1x = [
          '--without-gui',
          '--export-type=png',
          '--export-filename=' + output.to_s,
          '--export-area-drawing',
          '--export-width=' + width.to_i.to_s,
          '--export-height=' + height.to_i.to_s,
          input.to_s
        ]
        return if system('inkscape', *args_1x)

        # Inkscape 0.x: --file and --export-png
        success = system(
          'inkscape --export-text-to-path --without-gui ' \
          "--file=#{input} --export-#{ext}=#{output} " \
          "--export-width=#{width.to_i} --export-height=#{height.to_i}"
        )
        raise 'Inkscape export failed' unless success
      end

      def self.valid?(path)
        data = File.read(path)
        data.length > 0
      end
    end
  end
end
