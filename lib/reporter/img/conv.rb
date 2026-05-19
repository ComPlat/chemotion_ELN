# frozen_string_literal: true

require 'nokogiri'

module Reporter
  module Img
    module Conv
      def self.data_to_svg(svg_data)
        svg_file = Tempfile.new(['diagram', '.svg'])
        File.open(svg_file.path, 'w') { |file| file.write(svg_data) }
        svg_file.path
      end

      def self.ext_to_path(target_ext)
        output_file = Tempfile.new(['diagram', ".#{target_ext}"])
        File.open(output_file.path, 'w')
        output_file.path
      end

      def self.by_inkscape(input, output, ext, width: 1550, height: 440)
        # The composed reaction SVG has an outer <svg width="1560" height="440"> and
        # an inner <svg width="100%"> with no explicit height. Inkscape 1.x resolves
        # the inner height from the viewBox aspect ratio, which can exceed 440 px for
        # reactions with tall polymer molecules. --export-area-page then clips that
        # overflow, producing a blank image. Pinning height="100%" on the inner element
        # keeps it inside the outer frame and lets the viewBox scale all content
        # (including polymer images) uniformly to fit, so --export-area-page is safe.
        prepared = pin_nested_svg_height(input)

        # Inkscape 1.x: --export-type and --export-filename (or -o)
        args_1x = [
          '--without-gui',
          '--export-type=png',
          "--export-filename=#{output}",
          '--export-area-page',
          "--export-width=#{width.to_i}",
          "--export-height=#{height.to_i}",
          prepared,
        ]
        return if system('inkscape', *args_1x)

        # Inkscape 0.x: --file and --export-png
        success = system(
          'inkscape --export-text-to-path --without-gui ' \
          "--file=#{prepared} --export-#{ext}=#{output} " \
          "--export-width=#{width.to_i} --export-height=#{height.to_i}",
        )
        raise 'Inkscape export failed' unless success
      end

      # Adds height="100%" to any nested <svg> that carries width="100%" but no
      # explicit height attribute. Returns the path of a patched temp file when
      # changes are needed, or the original path when the SVG is already correct.
      def self.pin_nested_svg_height(svg_path)
        doc = Nokogiri::XML(File.read(svg_path))
        outer = doc.at_xpath('//*[local-name()="svg"]')
        return svg_path unless outer

        changed = false
        outer.xpath('.//*[local-name()="svg"]').each do |inner|
          next unless inner['width'] == '100%' && inner['height'].nil?

          inner['height'] = '100%'
          changed = true
        end
        return svg_path unless changed

        tmp = Tempfile.new(['diagram_prepared', '.svg'])
        tmp.write(doc.to_xml)
        tmp.close
        tmp.path
      end

      def self.valid?(path)
        data = File.read(path)
        !data.empty?
      end
    end
  end
end
