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
        # Inkscape has inconsistent support for data:image/svg+xml;base64 URIs in
        # <image> elements — they are silently dropped on some versions/configs.
        # inline_svg_images decodes and inlines them as <g> elements. It is a no-op
        # for SVGs that contain no such URIs (all non-polymer cases).
        inlined, inlined_tmp = inline_svg_images(prepared)

        # Inkscape 1.x: --export-type and --export-filename (or -o)
        args_1x = [
          '--without-gui',
          '--export-type=png',
          "--export-filename=#{output}",
          '--export-area-page',
          "--export-width=#{width.to_i}",
          "--export-height=#{height.to_i}",
          inlined,
        ]
        return if system('inkscape', *args_1x)

        # Inkscape 0.x: --file and --export-png
        success = system(
          'inkscape --export-text-to-path --without-gui ' \
          "--file=#{inlined} --export-#{ext}=#{output} " \
          "--export-width=#{width.to_i} --export-height=#{height.to_i}",
        )
        raise 'Inkscape export failed' unless success
      ensure
        prepared_tmp&.close!
        inlined_tmp&.close!
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

      # Replaces <image> elements whose href/xlink:href is a data:image/svg+xml;base64
      # URI with an inline positioned <g> containing the decoded SVG children.
      # Inkscape has inconsistent support for embedded SVG data URIs; inlining ensures
      # polymer template shapes always render. Returns [path, nil] unchanged when the
      # SVG has no such images — no impact on regular (non-polymer) SVGs.
      #
      # @param svg_path [String] path to the SVG file to inspect
      # @return [Array(String, Tempfile)] [patched_path, tmp] or [svg_path, nil]
      def self.inline_svg_images(svg_path)
        content = File.read(svg_path)
        return [svg_path, nil] unless content.include?('data:image/svg+xml;base64,')

        doc = Nokogiri::XML(content)
        images = doc.xpath('//*[local-name()="image"]').select do |img|
          href = img['href'] || img['xlink:href']
          href&.start_with?('data:image/svg+xml;base64,')
        end
        return [svg_path, nil] if images.empty?

        images.each do |img|
          href = img['href'] || img['xlink:href']
          b64 = href.sub('data:image/svg+xml;base64,', '')
          inner_doc = Nokogiri::XML(Base64.decode64(b64))
          inner_root = inner_doc.at_xpath('//*[local-name()="svg"]')
          next unless inner_root

          x = img['x'].to_f
          y = img['y'].to_f
          w = img['width'].to_f
          h = img['height'].to_f
          next if w <= 0 || h <= 0

          vb = (inner_root['viewBox'] || inner_root['viewbox'])&.split&.map(&:to_f)
          vb_x = vb&.dig(0).to_f
          vb_y = vb&.dig(1).to_f
          vb_w = vb&.dig(2).to_f
          vb_h = vb&.dig(3).to_f
          sx = vb_w.positive? ? (w / vb_w) : 1.0
          sy = vb_h.positive? ? (h / vb_h) : 1.0

          group = Nokogiri::XML::Node.new('g', doc)
          # translate(X,Y) maps the destination top-left; scale maps viewBox units to
          # destination pixels; translate(-vb_x,-vb_y) shifts the non-zero viewBox
          # origin to (0,0) so the content aligns with the destination rectangle.
          group['transform'] = "translate(#{x.round(4)},#{y.round(4)}) " \
                               "scale(#{sx.round(6)},#{sy.round(6)}) " \
                               "translate(#{(-vb_x).round(4)},#{(-vb_y).round(4)})"
          inner_root.children.each { |child| group.add_child(child.dup) }
          img.replace(group)
        end

        tmp = Tempfile.new(['diagram_inlined', '.svg'])
        tmp.write(doc.to_xml)
        tmp.close
        [tmp.path, tmp]
      rescue StandardError => e
        Rails.logger.error("Reporter::Img::Conv.inline_svg_images failed: #{e.message}")
        [svg_path, nil]
      end

      def self.valid?(path)
        data = File.read(path)
        !data.empty?
      end
    end
  end
end
