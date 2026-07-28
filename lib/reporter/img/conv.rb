# frozen_string_literal: true

require 'nokogiri'

module Reporter
  module Img
    module Conv # rubocop:disable Metrics/ModuleLength
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

      # Default canvas for composed reaction-scheme SVGs (see SVG::ReactionComposer).
      DEFAULT_EXPORT_WIDTH = 1550
      DEFAULT_EXPORT_HEIGHT = 440

      def self.by_inkscape(input, output, ext, width: DEFAULT_EXPORT_WIDTH, height: DEFAULT_EXPORT_HEIGHT)
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

      # Parses an SVG file for its declared page size from the root +<svg>+.
      # Prefers width/height attributes (the Inkscape page) over viewBox, and
      # ignores nested +<svg>+ viewBoxes used for content layout inside composed
      # reaction schemes.
      #
      # @param svg_path [String, Pathname]
      # @return [Array(Float, Float), Array(nil, nil)] +[width, height]+ in user units
      def self.svg_page_dimensions(svg_path)
        return [nil, nil] unless File.file?(svg_path)

        doc = Nokogiri::XML(File.read(svg_path, encoding: 'UTF-8'))
        outer = doc.at_xpath('/*[local-name()="svg"]') || doc.at_xpath('//*[local-name()="svg"]')
        return [nil, nil] unless outer

        svg_attr_dimensions(outer) || svg_viewbox_dimensions(outer) || [nil, nil]
      end

      # Dimensions from the root +<svg>+'s explicit width/height, or nil when
      # either is missing or non-positive (e.g. +width="100%"+, +width="0"+,
      # or a negative value) so the caller falls back to the viewBox.
      def self.svg_attr_dimensions(outer)
        w = parse_svg_length(outer['width'])
        h = parse_svg_length(outer['height'])

        [w, h] if w&.positive? && h&.positive?
      end

      # Dimensions from the root +<svg>+'s +viewBox+ ("min-x min-y width
      # height"); SVG allows the four values to be separated by whitespace
      # and/or commas, with optional leading space.
      def self.svg_viewbox_dimensions(outer)
        vb = (outer['viewBox'] || outer['viewbox']).to_s.strip.split(/[\s,]+/)

        [vb[2].to_f, vb[3].to_f] if vb.size >= 4
      end

      # Parses the leading numeric magnitude of an SVG length, ignoring any unit
      # suffix (px, pt, mm…). Handles a leading sign and scientific notation, and
      # preserves a negative sign so degenerate lengths are rejected by the
      # +w > 0+ guard in +svg_page_dimensions+ rather than silently flipped
      # positive. Percentages are unresolvable without a viewport, so they return
      # nil (letting the viewBox fallback take over).
      #
      # @param value [String, nil]
      # @return [Float, nil]
      def self.parse_svg_length(value)
        return if value.blank?
        return if value.to_s.include?('%')

        match = value.to_s.strip.match(/\A[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/)
        match && match[0].to_f
      end

      # Export width/height for +by_inkscape+ that preserve the SVG page aspect
      # ratio while fitting inside +max_width+×+max_height+.
      #
      # +--export-area-page+ scales the declared SVG page to the given export
      # size. Using the default 1550×440 reaction-scheme canvas on a roughly
      # square molecule/Ketcher SVG leaves most of the PNG blank. Callers that
      # rasterize raw (uncomposed) SVGs should use this helper so the export
      # canvas matches the page.
      #
      # @param svg_path [String, Pathname]
      # @param max_width [Integer]
      # @param max_height [Integer]
      # @return [Array(Integer, Integer)]
      def self.export_size_for(svg_path, max_width: DEFAULT_EXPORT_WIDTH, max_height: DEFAULT_EXPORT_HEIGHT)
        w, h = svg_page_dimensions(svg_path)
        return [max_width, max_height] if w.nil? || h.nil? || w <= 0 || h <= 0

        scale = [max_width.to_f / w, max_height.to_f / h].min
        # Clamp to at least 1px: an extreme aspect ratio can round the short
        # side to 0, and Inkscape rejects --export-width=0 / --export-height=0.
        export_w = [(w * scale).round, 1].max
        export_h = [(h * scale).round, 1].max

        [export_w, export_h]
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
      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
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
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity

      def self.valid?(path)
        data = File.read(path)
        !data.empty?
      end
    end
  end
end
