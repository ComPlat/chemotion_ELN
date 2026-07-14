# frozen_string_literal: true

require 'nokogiri'

module Reporter
  module Img
    module Conv
      # Writes the given SVG markup to a fresh Tempfile and returns the
      # (closed) Tempfile object. The caller owns the Tempfile and must call
      # +close!+ on it when done to delete the underlying file.
      #
      # @param svg_data [String] raw SVG markup
      # @return [Tempfile] a closed Tempfile whose path holds +svg_data+
      def self.data_to_svg(svg_data)
        svg_file = Tempfile.new(['diagram', '.svg'])
        svg_file.write(svg_data)
        svg_file.close
        svg_file
      end

      # Allocates a closed Tempfile with the requested extension, suitable
      # as an output target for Inkscape. The caller owns the Tempfile and
      # must call +close!+ on it when done.
      #
      # @param target_ext [String, Symbol] extension without the leading dot
      #   (e.g. +"png"+)
      # @return [Tempfile] a closed Tempfile at the requested extension
      def self.ext_to_path(target_ext)
        output_file = Tempfile.new(['diagram', ".#{target_ext}"])
        output_file.close
        output_file
      end

      def self.by_inkscape(input, output, ext, width: 1550, height: 440)
        input = input.to_s
        output = output.to_s
        # The composed reaction SVG has an outer <svg width="1560" height="440"> and
        # an inner <svg width="100%"> with no explicit height. Inkscape 1.x resolves
        # the inner height from the viewBox aspect ratio, which can exceed 440 px for
        # reactions with tall polymer molecules. --export-area-page then clips that
        # overflow, producing a blank image. Pinning height="100%" on the inner element
        # keeps it inside the outer frame and lets the viewBox scale all content
        # (including polymer images) uniformly to fit, so --export-area-page is safe.
        prepared, prepared_tmp = pin_nested_svg_height(input)

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
      ensure
        prepared_tmp&.close!
      end

      # Patches any nested +<svg>+ element that has +width="100%"+ but no
      # explicit height by adding +height="100%"+. Keeps the inner frame
      # inside the outer page so +--export-area-page+ does not clip
      # overflowing content. When a patched copy is produced, the caller
      # owns the returned Tempfile and must call +close!+ on it.
      #
      # @param svg_path [String] path to the SVG file to inspect
      # @return [Array(String, Tempfile)] +[patched_path, tmp]+ when a
      #   patched copy was written; caller must close! the Tempfile
      # @return [Array(String, nil)] +[svg_path, nil]+ when the SVG needed
      #   no patch (path is the original input)
      def self.pin_nested_svg_height(svg_path)
        doc = Nokogiri::XML(File.read(svg_path))
        outer = doc.at_xpath('//*[local-name()="svg"]')
        return [svg_path, nil] unless outer

        changed = false
        outer.xpath('.//*[local-name()="svg"]').each do |inner|
          next unless inner['width'] == '100%' && inner['height'].nil?

          inner['height'] = '100%'
          changed = true
        end
        return [svg_path, nil] unless changed

        tmp = Tempfile.new(['diagram_prepared', '.svg'])
        tmp.write(doc.to_xml)
        tmp.close
        [tmp.path, tmp]
      end

      def self.valid?(path)
        data = File.read(path)
        !data.empty?
      end
    end
  end
end
