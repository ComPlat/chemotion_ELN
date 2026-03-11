# frozen_string_literal: true

require Rails.root.join('lib/ketcher_service/render_svg.rb')
require 'base64'

# rubocop:disable Rails/Output
module Chemotion
  # Unified SVG renderer with fallback chain:
  # 1. IndigoService (if enabled)
  # 2. KetcherService (if Indigo fails or is disabled)
  # 3. OpenBabelService (if both fail)
  class SvgRenderer
    # Renders SVG from molfile. Service order can be chosen or auto-detected from molfile.
    #
    # @param struct [String] The molfile structure to render
    # @param service [String, Symbol, nil] Preferred service: :indigo, :ketcher, or :open_babel. When nil, uses
    #   Indigo first if molfile contains a PolymersList tag, otherwise Ketcher first; then falls back to OpenBabel.
    # @return [String, nil] The rendered SVG, or nil if all services fail
    def self.render_svg_from_molfile(struct, service: nil)
      has_polymer = has_polymers_list_tag?(struct)
      polymer_data = parse_polymer_payload(struct)
      # Use cleaned_struct only for rendering (Indigo/Ketcher/OpenBabel may not handle > <PolymersList>). The full struct is passed to finalize_svg for injection.
      render_struct = polymer_data[:cleaned_struct]
      chain = service_chain(service, struct)
      indigo_options = has_polymer ? { scale_factor: 90, label_font_size: 5 } : {}

      chain.each do |name|
        rendered_svg = if name == :indigo
                        indigo_service(render_struct, indigo_options)
                      else
                        send(:"#{name}_service", render_struct)
                      end
        if rendered_svg.present?
          # Pass full struct (with PolymersList) to finalize_svg so inject_polymer_shapes can run; polymer_data was parsed from this full struct.
          return finalize_svg(rendered_svg, struct, polymer_data)
        end
      end

      nil
    rescue StandardError
      raise
    end

    # Returns the ordered list of service names to try (e.g. %i[indigo ketcher open_babel]).
    # When service is nil: if molfile has PolymersList tag use Indigo first, else Ketcher first; then fallback to OpenBabel.
    def self.service_chain(service, struct)
      case service.to_s.presence&.downcase
      when 'indigo'
        %i[indigo ketcher open_babel]
      when 'ketcher'
        %i[ketcher open_babel]
      when 'open_babel'
        %i[open_babel]
      else
        # Default: PolymersList present -> Indigo first; else Ketcher first
        has_polymers_list_tag?(struct) ? %i[indigo ketcher open_babel] : %i[ketcher open_babel]
      end
    end

    # True when molfile contains the PolymersList tag (e.g. "> <PolymersList>").
    def self.has_polymers_list_tag?(struct)
      return false if struct.blank?
      struct.to_s.include?('> <PolymersList>')
    end

    def self.finalize_svg(svg, molfile, polymer_data)
      # Polymer injection uses molfile (full, with PolymersList) and polymer_data parsed from it; only rendering used cleaned_struct.
      if has_polymer_list?(polymer_data)
        with_polymer = inject_polymer_shapes(svg, molfile, polymer_data)
        used_injected = with_polymer.present? && with_polymer != svg
        if used_injected
          doc = Nokogiri::XML(with_polymer)
          has_text_nodes = doc.xpath('//*[local-name()="text"]').any?
          if has_text_nodes
            trimmed = KetcherService::SVGProcessor.clean_and_trim_svg(with_polymer)
            with_polymer = trimmed if trimmed.present?
          end
          sanitize_svg(remove_placeholder_paths(with_polymer))
        else
          sanitize_svg(remove_placeholder_paths(svg))
        end
      else
        sanitize_svg(remove_placeholder_paths(svg))
      end
    end

    # Removes the small ellipse placeholder path sometimes emitted by Indigo (R# placeholder).
    # Matches path with fill="none", stroke-width 0.0166667, and the distinctive d curve.
    # @param svg [String] SVG markup
    # @return [String] SVG with matching path(s) removed, or original string if parse fails
    def self.remove_placeholder_paths(svg)
      return svg if svg.blank?

      doc = Nokogiri::XML(svg)
      # Small ellipse placeholder: M x y C (6 numbers) C (6 numbers). Matches both known variants (0.44/0.39 and 0.39/0.33).
      path_d_pattern = %r{M\s*[\d.]+\s+[\d.]+\s+C\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+C\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s*}
      removed = 0
      doc.xpath('//*[local-name()="path"]').each do |path_el|
        d = path_el['d'].to_s
        next if d.blank?
        next unless path_el['fill'] == 'none' && path_el['stroke-width'].to_s.start_with?('0.016')
        next unless d.match?(path_d_pattern)

        path_el.remove
        removed += 1
      end
      removed.positive? ? doc.to_xml : svg
    rescue StandardError
      svg
    end

    # True when polymer_data contains a non-empty polymers list (injection path applies).
    def self.has_polymer_list?(polymer_data)
      polymer_data.present? && polymer_data[:polymers].present?
    end

    # Sanitizes the rendered SVG
    #
    # @param svg [String] The SVG to sanitize
    # @return [String, nil] The sanitized SVG, or nil if input is blank or sanitization fails
    def self.sanitize_svg(svg)
      return nil if svg.blank?

      sanitized = Chemotion::Sanitizer.scrub_svg(svg, remap_glyph_ids: true)
      # Return nil if sanitization resulted in empty or blank string
      sanitized.presence
    rescue StandardError => e
      Rails.logger.error("SVG sanitization failed: #{e.message}")
      # Return nil on error to ensure we don't return unsanitized content
      nil
    end

    # Attempts to render SVG using IndigoService
    #
    # @param struct [String] The molfile structure to render
    # @param options [Hash, nil] Optional overrides for Indigo (e.g. scale_factor: 90, label_font_size: 5 when molfile has polymer)
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.indigo_service(struct, options = nil)
      if IndigoService.disabled?
        return nil
      end

      indigo_opts = options.present? ? options.slice(:scale_factor, :label_font_size) : nil
      rendered_svg = IndigoService.new(struct, 'image/svg+xml', indigo_opts).render_structure
      if rendered_svg.present?
        return rendered_svg
      end

      nil
    end

    # Attempts to render SVG using KetcherService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.ketcher_service(struct)
      if KetcherService.disabled?
        return nil
      end

      rendered_svg = render_svg(struct)
      if rendered_svg.present?
        rendered_svg
      else
        nil
      end
    rescue StandardError => e
      Rails.logger.error("KetcherService exception: #{e.message}")
      nil
    end

    # Attempts to render SVG using OpenBabelService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered and processed SVG, or nil if rendering fails
    def self.open_babel_service(struct)
      rendered_svg = OpenBabelService.svg_from_molfile(struct)
      if rendered_svg.present?
        rendered_svg
      else
        nil
      end
    rescue StandardError => e
      Rails.logger.error("❌ OpenBabelService failed: #{e.message}")
      nil
    end

    # Renders SVG from molfile using Ketcher service only
    #
    # @param molfile [String] The molfile structure to render
    # @return [String, nil] The rendered and processed SVG, or nil if rendering fails
    def self.render_svg(molfile)
      rendered_svg = KetcherService::RenderSvg.svg(molfile)
      return nil if rendered_svg.blank?

      svg = KetcherService::SVGProcessor.new(rendered_svg)
      svg.centered_and_scaled_svg
    rescue StandardError => e
      Rails.logger.error("Chemotion::SvgRenderer failed: #{e.message}")
      nil
    end

    def self.parse_polymer_payload(struct)
      source = struct.to_s
      # Strip PolymersList/TextNode only for cleaned_struct (used for rendering); polymers/text_by_index are from full source for injection.
      cleaned_struct = source
        .gsub(/^> <PolymersList>\R.*?(?=^> <|\z)/m, '')
        .gsub(/^> <TextNode>\R.*?^> <\/TextNode>\R?/m, '')

      polymers_line = extract_polymers_line(source)
      polymers = parse_polymers_line(polymers_line)
      text_by_index = parse_text_nodes(source)

      {
        cleaned_struct: cleaned_struct,
        polymers: polymers,
        text_by_index: text_by_index,
      }
    end

    def self.extract_polymers_line(source)
      lines = source.to_s.lines
      # When there are multiple "> <PolymersList>" blocks (e.g. redundant indices-only then full format), prefer the one with full format (contains "/") so we get correct template_id.
      blocks = []
      idx = 0
      while idx < lines.length
        start_idx = lines[idx..].find_index { |line| line.strip == '> <PolymersList>' }
        break unless start_idx

        start_idx += idx
        data = []
        i = start_idx + 1
        while i < lines.length
          line = lines[i].strip
          break if line.start_with?('> <') || line == '$$$$'
          data << line unless line.empty?
          i += 1
        end
        content = data.join(' ').strip
        blocks << content unless content.empty?
        idx = start_idx + 1
      end

      return '' if blocks.empty?

      # Prefer block that contains full format (e.g. "0/95/1.00-1.00") over indices-only ("0 1 2")
      full_format_block = blocks.find { |content| content.include?('/') }
      full_format_block.presence || blocks.first.to_s
    end

    def self.parse_polymers_line(polymers_line)
      return [] if polymers_line.blank?

      full_format = polymers_line.split(/\s+/).filter_map do |token|
        parts = token.split('/')
        next if parts.size < 3

        atom_index = Integer(parts[0], exception: false)
        template_id = Integer(parts[1], exception: false)
        next if atom_index.nil? || template_id.nil?

        height, width = parse_size(parts[2])
        next unless height && width

        { atom_index: atom_index, template_id: template_id, height: height, width: width }
      end

      return full_format if full_format.any?

      # Fallback: PolymersList content is indices-only (e.g. "0 1 2" or "0") — build default polymer entries so injection runs.
      indices = polymers_line.split(/\s+/).filter_map do |token|
        n = Integer(token, exception: false)
        n if n.is_a?(Integer) && n >= 0
      end
      indices.map { |atom_index| { atom_index: atom_index, template_id: 1, height: 2.0, width: 2.0 } }
    end

    def self.parse_size(size_token)
      size = size_token.to_s.strip
      return [nil, nil] if size.empty?

      h, w = size.split('-', 2)
      height = Float(h, exception: false)
      width = Float(w, exception: false)
      [height, width]
    end

    def self.parse_text_nodes(source)
      lines = source.to_s.lines
      start_idx = lines.find_index { |line| line.strip == '> <TextNode>' }
      end_idx = lines.find_index { |line| line.strip == '> </TextNode>' }
      return {} unless start_idx && end_idx && end_idx > start_idx

      lines[(start_idx + 1)...end_idx].each_with_object({}) do |raw, memo|
        line = raw.strip
        next if line.empty?

        parts = line.split('#', 4)
        next unless parts.length == 4

        index = Integer(parts[0], exception: false)
        next if index.nil?

        text = parts[3].to_s.encode('UTF-8', invalid: :replace, undef: :replace, replace: '').strip
        memo[index] = text unless text.empty?
      end
    end

    # --- Polymer injection (only when molfile has polymer list) ---

    # Single formula for polymer image scaling: handles 1 to many images (1..20+).
    # Returns { scale_x:, scale_y:, multi: }. n=1 uses large extent + boost; n>=2 uses extent that
    # scales with n when n>=3 or (n==2 and no labels); n=3 applies /0.7 and *0.9 for legacy behavior.
    def self.compute_polymer_scale_factors(n, has_labels, bounds)
      base = 0.8
      if n == 1
        extent_x = extent_y = 6.0
        scale_x = bounds[:sx].abs / extent_x * base * 1.7
        scale_y = bounds[:sy].abs / extent_y * base * 1.7
      else
        scale_extent = (n >= 3) || (n == 2 && !has_labels)
        mult = scale_extent ? (n / 2.0) / (n == 3 ? 0.7 : 1) : 1
        extent_x = 1.25 * mult
        extent_y = 2.5 * mult
        scale_x = bounds[:sx].abs / extent_x * base
        scale_y = bounds[:sy].abs / extent_y * base
        if n == 3
          scale_x *= 0.9
          scale_y *= 0.9
        end
      end
      { scale_x: scale_x, scale_y: scale_y, multi: n >= 2 }
    end

    def self.inject_polymer_shapes(svg, molfile, polymer_data)
      polymers = polymer_data[:polymers]

      return svg if svg.blank? || polymers.blank?

      # Ensure polymer order matches position order: positions are always top-to-bottom (ascending y).
      # Sort polymers by their atom's y (descending molfile y = top first) so polymer[i] -> position[i].
      atom_positions = parse_atom_positions(molfile)
      polymers = if atom_positions.present?
                   polymers.sort_by { |p| -(atom_positions[p[:atom_index]]&.[](1) || -Float::INFINITY) }
                 else
                   polymers.sort_by { |p| p[:atom_index] }
                 end

      # When Indigo renders R# as glyphs, replace <use> nodes with shapes+labels from molfile (position preserved by transform).
      doc = Nokogiri::XML(svg)
      r_glyph_id = find_r_glyph_id(doc)
      if r_glyph_id && find_use_elements_referencing_glyph(doc, r_glyph_id).any?
        return replace_r_glyph_uses_with_molfile_content(svg, molfile, polymer_data.merge(polymers: polymers))
      end

      positions = extract_r_or_a_positions_from_svg(svg)
      used_molfile_fallback = false
      if positions.empty?
        log_text_elements_snippet(svg)
        # Fallback: use molfile atom coordinates when SVG has no R#/A text (e.g. Indigo renders R# as paths)
        bounds = find_svg_bounds(svg)
        unless bounds
          return svg
        end
        positions = positions_from_molfile(molfile, polymers, bounds)
        if positions.empty?
          return svg
        end
        used_molfile_fallback = true
      end

      doc = Nokogiri::XML(svg)
      svg_root = doc.xpath('//*[local-name()="svg"]').first
      unless svg_root
        return svg
      end

      bounds = find_svg_bounds(svg)
      unless bounds
        return svg
      end

      template_lookup = load_surface_template_lookup
      if template_lookup.empty?
        return svg
      end

      svg_root['xmlns:xlink'] ||= 'http://www.w3.org/1999/xlink'
      occupied = []
      labels = polymer_data[:text_by_index] || {}

      factors = compute_polymer_scale_factors(polymers.size, labels.any?, bounds)
      scale_x = factors[:scale_x]
      scale_y = factors[:scale_y]

      # Convert content coords to viewBox space (images are svg-root children; content is in g with transform)
      margin_half = 10.0
      positions_viewbox = positions.map do |p|
        { x: p[:x] - bounds[:min_x] + margin_half, y: p[:y] - bounds[:min_y] + margin_half }
      end

      # Map first polymer image to first R#/A, second to second, etc. (by vertical order)
      injected = 0
      polymers.each_with_index do |polymer, idx|
        pos = positions_viewbox[idx]
        break unless pos

        template = template_lookup[polymer[:template_id]]
        unless template
          next
        end

        icon_data = load_template_svg_data_uri(template)
        if icon_data.blank?
          next
        end

        x = pos[:x]
        y = pos[:y]
        # Single scale preserves image ratio (e.g. 1:1 stays 1:1); base scale then +40% size.
        scale = scale_x * 9
        width = polymer[:width] * scale
        height = polymer[:height] * scale
        img_x = x - (width / 2.0)
        img_y = y - (height / 2.0) - (height * 0.04)

        image_node = Nokogiri::XML::Node.new('image', doc)
        image_node['x'] = img_x.round(4).to_s
        image_node['y'] = img_y.round(4).to_s
        image_node['width'] = width.round(4).to_s
        image_node['height'] = height.round(4).to_s
        image_node['preserveAspectRatio'] = 'xMidYMid meet'
        image_node['xlink:href'] = icon_data
        image_node['href'] = icon_data
        svg_root.add_child(image_node)
        injected += 1

        occupied << { x: img_x, y: img_y, width: width, height: height }

        label = labels[polymer[:atom_index]]
        next if label.blank?

        add_polymer_label(doc, svg_root, label, img_x, img_y, width, height, bounds, occupied, polymer_count: polymers.size)
      end

      remove_r_or_a_placeholder_text(doc)
      remove_r_or_a_placeholder_glyphs(doc, occupied) if used_molfile_fallback && occupied.any?
      expand_svg_viewbox_to_include(doc, bounds, occupied)
      doc.to_xml
    rescue StandardError => e
      Rails.logger.error("Polymer SVG injection failed: #{e.message}")
      svg
    end

    # Removes R#/A placeholder text elements from the SVG doc (replaced by images).
    def self.remove_r_or_a_placeholder_text(doc)
      # Namespace-agnostic: Indigo SVG uses default xmlns
      text_nodes = doc.xpath('//*[local-name()="text"]')
      removed = 0
      text_nodes.each do |el|
        tspans = el.xpath('.//*[local-name()="tspan"]')
        content = tspans.any? ? tspans.map(&:content).join : el.content.to_s
        content = content.to_s.strip
        # Match R1, R#, R, A and variants with optional space (Indigo: "R 1", "R #", "R")
        if content.match?(/\A\s*(R\s*\d+|R\s*#|R|A)\s*\z/)
          el.remove
          removed += 1
        end
      end
    end

    # When R#/A was placed via molfile fallback, Indigo may have drawn them as <use> glyphs.
    # Remove <use> elements that reference defs glyphs and are near an injected image center.
    def self.remove_r_or_a_placeholder_glyphs(doc, occupied)
      return if occupied.nil? || occupied.empty?

      centers = occupied.map do |o|
        { x: o[:x] + o[:width] / 2.0, y: o[:y] + o[:height] / 2.0, radius: [o[:width], o[:height]].max * 0.6 }
      end

      doc.xpath('//*[local-name()="use"]').each do |use_el|
        href = use_el['xlink:href'] || use_el['href']
        next unless href.to_s.start_with?('#') && href.to_s.match?(/^#glyph-/i)

        ux = (use_el['x'] || 0).to_f
        uy = (use_el['y'] || 0).to_f
        # Simple transform on parent <g>: translate(tx, ty) -> add to ux, uy
        parent = use_el.respond_to?(:parent) ? use_el.parent : nil
        if parent && parent.element? && (t = parent['transform'].to_s).present?
          m = t.match(/translate\s*\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*(?:,\s*|\s+)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/)
          if m
            ux += m[1].to_f
            uy += m[2].to_f
          end
        end

        next unless centers.any? do |c|
          dist = Math.sqrt((ux - c[:x])**2 + (uy - c[:y])**2)
          dist <= c[:radius]
        end

        use_el.remove
      end
    end

    # Parses SVG, replaces <use> elements that reference the "R" glyph with polymer shapes and
    # text from the molfile, preserves position via transform, removes unused glyph from defs.
    # Returns the modified SVG as a string.
    #
    # @param svg [String] SVG document
    # @param molfile [String] Molfile structure (for atom positions if needed)
    # @param polymer_data [Hash] { polymers:, text_by_index: }
    # @param options [Hash] optional r_glyph_id: glyph id (e.g. "glyph-0-0") to replace; if nil, the first glyph referenced by a <use> is used
    # @return [String] modified SVG XML
    def self.replace_r_glyph_uses_with_molfile_content(svg, molfile, polymer_data, options = {})
      return svg if svg.blank?

      doc = Nokogiri::XML(svg)
      svg_root = doc.xpath('//*[local-name()="svg"]').first
      unless svg_root
        return svg
      end

      r_glyph_id = options[:r_glyph_id] || find_r_glyph_id(doc)
      unless r_glyph_id
        return doc.to_xml
      end

      use_elements = find_use_elements_referencing_glyph(doc, r_glyph_id)
      return doc.to_xml if use_elements.empty?

      polymers = polymer_data[:polymers] || []
      labels = polymer_data[:text_by_index] || {}
      return doc.to_xml if polymers.empty?

      bounds = find_svg_bounds(svg)
      unless bounds
        return doc.to_xml
      end

      template_lookup = load_surface_template_lookup
      if template_lookup.empty?
        return doc.to_xml
      end

      svg_root['xmlns:xlink'] ||= 'http://www.w3.org/1999/xlink'
      factors = compute_polymer_scale_factors(polymers.size, labels.any?, bounds)
      scale_x = factors[:scale_x]
      scale_y = factors[:scale_y]
      multi = factors[:multi]

      # Sort uses by vertical position (top to bottom), then horizontal
      use_elements.sort_by! do |use_el|
        pos = get_use_position(use_el)
        [pos[:y], pos[:x]]
      end

      injected_groups = []
      occupied = []
      use_elements.each_with_index do |use_el, idx|
        polymer = polymers[idx]
        break unless polymer

        template = template_lookup[polymer[:template_id]]
        next unless template

        icon_data = load_template_svg_data_uri(template)
        next if icon_data.blank?

        pos = get_use_position(use_el)
        ux = pos[:x]
        uy = pos[:y]
        # Single scale preserves image ratio (e.g. 1:1 stays 1:1). Single image uses same scale as inject path (6) so size matches when label present.
        scale = (polymers.size == 1) ? (scale_x * 1) : (scale_x * 0.84)
        width = polymer[:width] * scale
        height = polymer[:height] * scale
        uy -= height * 0.04

        group = Nokogiri::XML::Node.new('g', doc)
        group['transform'] = "translate(#{ux.round(4)},#{uy.round(4)})"

        img_x = -width / 2.0
        img_y = -height / 2.0
        image_node = Nokogiri::XML::Node.new('image', doc)
        image_node['x'] = img_x.round(4).to_s
        image_node['y'] = img_y.round(4).to_s
        image_node['width'] = width.round(4).to_s
        image_node['height'] = height.round(4).to_s
        image_node['preserveAspectRatio'] = 'xMidYMid meet'
        image_node['xlink:href'] = icon_data
        image_node['href'] = icon_data
        group.add_child(image_node)

        label = labels[polymer[:atom_index]]
        if label.present?
          font_size = multi ? [[(height * 0.04), 10.0].max, 12.0].min : [[(height * 0.015), 2.0].max, 3.0].min
          text_width_est = [font_size * 0.55 * label.length, 20.0].max
          padding = multi ? 2.0 : 1.0
          text_x = (width / 2.0 + padding).round(4)
          text_node = Nokogiri::XML::Node.new('text', doc)
          text_node['x'] = text_x.to_s
          text_node['y'] = '0'
          text_node['text-anchor'] = 'start'
          text_node['font-family'] = 'Arial'
          text_node['font-size'] = "#{font_size.round(2)}px"
          text_node['fill'] = '#000000'
          tspan = Nokogiri::XML::Node.new('tspan', doc)
          tspan.content = label
          text_node.add_child(tspan)
          group.add_child(text_node)
        end

        use_el.replace(group)
        injected_groups << group
        occupied << { x: ux - width / 2.0, y: uy - height / 2.0 - (height * 0.04), width: width, height: height }
      end

      # Draw injected images on top: move their groups to the end of the SVG root
      injected_groups.each { |g| svg_root.add_child(g) }

      remove_unused_glyph_from_defs(doc, r_glyph_id)
      expand_svg_viewbox_to_include(doc, bounds, occupied)
      doc.to_xml
    rescue StandardError => e
      Rails.logger.error("Polymer replace_r_glyph failed: #{e.message}")
      svg
    end

    # Returns the glyph id (without #) that represents the letter R: the first glyph in defs
    # that is referenced by at least one <use> element.
    def self.find_r_glyph_id(doc)
      defs_glyph_ids = doc.xpath('//*[local-name()="defs"]//*[local-name()="g"][starts-with(@id,"glyph-")]')
        .map { |g| g['id'] }.compact.uniq.sort
      return nil if defs_glyph_ids.empty?

      referenced = doc.xpath('//*[local-name()="use"]').map do |u|
        href = (u['xlink:href'] || u['href']).to_s
        href.start_with?('#') ? href[1..] : nil
      end.compact.uniq

      defs_glyph_ids.find { |id| referenced.include?(id) }
    end

    # Returns [x, y] for a <use> element, including parent translate() if present.
    def self.get_use_position(use_el)
      ux = (use_el['x'] || 0).to_f
      uy = (use_el['y'] || 0).to_f
      parent = use_el.respond_to?(:parent) ? use_el.parent : nil
      if parent && parent.element? && (t = parent['transform'].to_s).present?
        m = t.match(/translate\s*\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*(?:,\s*|\s+)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/)
        if m
          ux += m[1].to_f
          uy += m[2].to_f
        end
      end
      { x: ux, y: uy }
    end

    # Returns all <use> elements whose xlink:href or href equals "#glyph_id".
    def self.find_use_elements_referencing_glyph(doc, glyph_id)
      doc.xpath('//*[local-name()="use"]').select do |u|
        href = (u['xlink:href'] || u['href']).to_s.strip
        href == "##{glyph_id}" || href == glyph_id
      end
    end

    # Removes the glyph definition (e.g. <g id="glyph-0-0">) from defs if no <use> references it.
    def self.remove_unused_glyph_from_defs(doc, glyph_id)
      ref = "##{glyph_id}"
      still_used = doc.xpath('//*[local-name()="use"]').any? do |u|
        href = (u['xlink:href'] || u['href']).to_s.strip
        href == ref || href == glyph_id
      end
      return if still_used

      doc.xpath('//*[local-name()="defs"]//*[local-name()="g"]').each do |g|
        g.remove if g['id'] == glyph_id
      end
    end
    def self.log_text_elements_snippet(svg)
      # No-op: previously logged SVG text elements for debugging.
    end

    # Finds text elements in SVG matching R# (R1, R2, ...), R#, or A alone.
    # Returns array of { x:, y: } sorted by vertical position (top to bottom).
    def self.extract_r_or_a_positions_from_svg(svg)
      processor = KetcherService::SVGProcessor.new(svg)
      processor.extract_r_or_a_positions.map { |h| { x: h[:x], y: h[:y] } }
    end

    # When SVG has no R#/A text (e.g. Indigo renders as paths), map polymer atom indices to SVG coords via molfile.
    # Returns array of { x:, y: } in the same order as polymers.
    def self.positions_from_molfile(molfile, polymers, svg_bounds)
      atom_positions = parse_atom_positions(molfile)
      return [] if atom_positions.empty?

      mol_bounds = find_mol_bounds(atom_positions)
      return [] unless mol_bounds

      polymers.filter_map do |p|
        coord = atom_positions[p[:atom_index]]
        next unless coord

        x = map_x(coord[0], mol_bounds, svg_bounds)
        y = map_y(coord[1], mol_bounds, svg_bounds)
        { x: x, y: y }
      end
    end

    def self.add_polymer_label(doc, svg_root, label, img_x, img_y, img_w, img_h, bounds, occupied, polymer_count: nil)
      # Smaller label: scale down font so label isn’t too big
      multi = polymer_count.to_i >= 2
      font_size = multi ? [[(img_h * 0.04), 10.0].max, 12.0].min : [[(img_h * 0.015), 2.0].max, 3.0].min
      text_width = [font_size * 0.55 * label.length, 20.0].max
      padding = multi ? 2.0 : 1.5
      baseline_y = img_y + (img_h / 2.0)

      right_x = img_x + img_w + padding
      left_x = img_x - padding - text_width

      right_rect = { x: right_x, y: baseline_y - font_size, width: text_width, height: font_size * 1.2 }
      left_rect = { x: left_x, y: baseline_y - font_size, width: text_width, height: font_size * 1.2 }

      # Prefer label on the RIGHT of the image; use left when no room on right or right overlaps
      fits_right = (right_x + text_width) <= bounds[:max_x]
      choose_right = fits_right

      if choose_right && overlaps_any?(right_rect, occupied)
        choose_right = false if left_x >= bounds[:min_x] && !overlaps_any?(left_rect, occupied)
      elsif !choose_right && overlaps_any?(left_rect, occupied) && fits_right && !overlaps_any?(right_rect, occupied)
        choose_right = true
      end

      text_x = choose_right ? right_x : left_x
      chosen_rect = choose_right ? right_rect : left_rect

      text_node = Nokogiri::XML::Node.new('text', doc)
      text_node['x'] = text_x.round(4).to_s
      text_node['y'] = baseline_y.round(4).to_s
      text_node['text-anchor'] = 'start'
      text_node['font-family'] = 'Arial'
      text_node['font-size'] = "#{font_size.round(2)}px"
      text_node['fill'] = '#000000'

      tspan = Nokogiri::XML::Node.new('tspan', doc)
      tspan.content = label
      text_node.add_child(tspan)
      svg_root.add_child(text_node)
      occupied << chosen_rect
    end

    def self.overlaps_any?(rect, others)
      others.any? do |o|
        rect[:x] < (o[:x] + o[:width]) &&
          (rect[:x] + rect[:width]) > o[:x] &&
          rect[:y] < (o[:y] + o[:height]) &&
          (rect[:y] + rect[:height]) > o[:y]
      end
    end

    def self.parse_atom_positions(molfile)
      lines = molfile.to_s.lines
      counts_idx = lines.find_index { |line| line.match?(/^\s*\d+\s+\d+\s+.*V2000/) }
      return {} unless counts_idx

      atom_count = lines[counts_idx].to_s.strip.split(/\s+/).first.to_i
      atoms_start = counts_idx + 1
      atoms = {}

      atom_count.times do |idx|
        line = lines[atoms_start + idx].to_s
        parts = line.strip.split(/\s+/)
        next unless parts.length >= 4

        x = Float(parts[0], exception: false)
        y = Float(parts[1], exception: false)
        next if x.nil? || y.nil?

        atoms[idx] = [x, y]
      end

      atoms
    end

    def self.find_mol_bounds(atom_by_index)
      coords = atom_by_index.values
      return nil if coords.empty?

      xs = coords.map(&:first)
      ys = coords.map(&:last)
      {
        min_x: xs.min,
        max_x: xs.max,
        min_y: ys.min,
        max_y: ys.max,
      }
    end

    def self.find_svg_bounds(svg)
      processor = KetcherService::SVGProcessor.new(svg)
      processor.find_extrema
      min = processor.min
      max = processor.max
      if min && max && min.compact.size == 2 && max.compact.size == 2
        dx = (max[0] - min[0]).abs
        dy = (max[1] - min[1]).abs
        return { min_x: min[0], max_x: max[0], min_y: min[1], max_y: max[1], sx: dx, sy: dy } unless dx <= 0.0001 || dy <= 0.0001
      end
      # Fallback: use SVG viewBox so polymer injection still works when content is in defs/use only
      bounds_from_viewbox(svg)
    end

    def self.bounds_from_viewbox(svg)
      doc = Nokogiri::XML(svg)
      root = doc.xpath('//*[local-name()="svg"]').first
      return nil unless root

      vb = root['viewBox'] || root['viewbox']
      return nil if vb.blank?

      parts = vb.strip.split(/\s+/)
      return nil unless parts.size >= 4

      min_x = Float(parts[0], exception: false)
      min_y = Float(parts[1], exception: false)
      w = Float(parts[2], exception: false)
      h = Float(parts[3], exception: false)
      return nil if min_x.nil? || min_y.nil? || w.nil? || h.nil? || w <= 0 || h <= 0

      {
        min_x: min_x,
        max_x: min_x + w,
        min_y: min_y,
        max_y: min_y + h,
        sx: w,
        sy: h,
      }
    end

    # Expand the viewBox in both dimensions so content has more space and is less congested.
    def self.widen_svg_viewbox_width(svg_string, width_factor: 1.5, height_factor: 1.6)
      return svg_string if svg_string.blank?

      doc = Nokogiri::XML(svg_string)
      root = doc.xpath('//*[local-name()="svg"]').first
      return svg_string unless root

      vb = root['viewBox'] || root['viewbox']
      return svg_string if vb.blank?

      parts = vb.strip.split(/\s+/)
      return svg_string unless parts.size >= 4

      min_x = Float(parts[0], exception: false)
      min_y = Float(parts[1], exception: false)
      w = Float(parts[2], exception: false)
      h = Float(parts[3], exception: false)
      return svg_string if min_x.nil? || min_y.nil? || w.nil? || h.nil? || w <= 0 || h <= 0

      new_w = (w * width_factor).round(4)
      new_h = (h * height_factor).round(4)
      root['viewBox'] = "#{min_x} #{min_y} #{new_w} #{new_h}"
      if root['width'].present?
        current_w = Float(root['width'], exception: false)
        root['width'] = (current_w * width_factor).round(4).to_s if current_w && current_w > 0
      end
      if root['height'].present?
        current_h = Float(root['height'], exception: false)
        root['height'] = (current_h * height_factor).round(4).to_s if current_h && current_h > 0
      end
      doc.to_xml
    rescue StandardError => e
      svg_string
    end

    # Expand the SVG viewBox (and width/height) to include original bounds plus all injected rects (e.g. polymer images), so nothing is clipped on the left or right.
    def self.expand_svg_viewbox_to_include(doc, bounds, occupied, padding: 10)
      return if doc.nil? || bounds.nil?

      root = doc.xpath('//*[local-name()="svg"]').first
      return unless root

      vb = root['viewBox'] || root['viewbox']
      return if vb.blank?

      parts = vb.strip.split(/\s+/)
      return unless parts.size >= 4

      old_min_x = Float(parts[0], exception: false)
      old_min_y = Float(parts[1], exception: false)
      old_w = Float(parts[2], exception: false)
      old_h = Float(parts[3], exception: false)
      return if old_min_x.nil? || old_min_y.nil? || old_w.nil? || old_h.nil? || old_w <= 0 || old_h <= 0

      min_x = bounds[:min_x]
      max_x = bounds[:max_x]
      min_y = bounds[:min_y]
      max_y = bounds[:max_y]

      if occupied.present?
        occupied.each do |o|
          min_x = [min_x, o[:x]].min
          max_x = [max_x, o[:x] + o[:width]].max
          min_y = [min_y, o[:y]].min
          max_y = [max_y, o[:y] + o[:height]].max
        end
      end

      min_x -= padding
      min_y -= padding
      max_x += padding
      max_y += padding

      new_w = (max_x - min_x).round(4)
      new_h = (max_y - min_y).round(4)
      return if new_w <= 0 || new_h <= 0

      root['viewBox'] = "#{min_x} #{min_y} #{new_w} #{new_h}"

      if root['width'].present? && root['height'].present?
        current_w = Float(root['width'], exception: false)
        current_h = Float(root['height'], exception: false)
        if current_w && current_w > 0 && current_h && current_h > 0
          # Scale width/height so the new viewBox is fully visible without stretching
          scale_w = new_w / old_w
          scale_h = new_h / old_h
          root['width'] = (current_w * scale_w).round(4).to_s
          root['height'] = (current_h * scale_h).round(4).to_s
        end
      end
    rescue StandardError => _e
      # non-fatal
    end

    def self.map_x(x, mol_bounds, svg_bounds)
      mol_dx = mol_bounds[:max_x] - mol_bounds[:min_x]
      if mol_dx.abs <= 0.0001
        return svg_bounds[:min_x] + (svg_bounds[:sx] || 0) / 2.0
      end
      ratio = (x - mol_bounds[:min_x]) / mol_dx
      svg_bounds[:min_x] + (ratio * svg_bounds[:sx])
    end

    def self.map_y(y, mol_bounds, svg_bounds)
      mol_dy = mol_bounds[:max_y] - mol_bounds[:min_y]
      if mol_dy.abs <= 0.0001
        return svg_bounds[:min_y] + (svg_bounds[:sy] || 0) / 2.0
      end
      # Molfile uses Cartesian Y-up, SVG uses Y-down.
      ratio = (mol_bounds[:max_y] - y) / mol_dy
      svg_bounds[:min_y] + (ratio * svg_bounds[:sy])
    end

    def self.load_surface_template_lookup
      @surface_template_lookup ||= begin
        json_path = Rails.root.join('public', 'json', 'surfaceChemistryShapes.json')
        raw = JSON.parse(File.read(json_path))
        lookup = {}
        raw.each do |category, groups|
          Array(groups).each do |group|
            Array(group['subTabs']).each do |sub_tab|
              Array(sub_tab['shapes']).each do |shape|
                tid = shape['template_id'].to_i
                lookup[tid] = { category: category, icon_name: shape['iconName'] } if tid.positive?
              end
            end
          end
        end
        lookup
      rescue StandardError => e
        Rails.logger.error("Failed to load surface chemistry shapes: #{e.message}")
        {}
      end
    end

    def self.load_template_svg_data_uri(template)
      path = Rails.root.join('public', 'polymerShapes', template[:category], "#{template[:icon_name]}.svg")
      return nil unless File.exist?(path)

      content = File.read(path)
      "data:image/svg+xml;base64,#{Base64.strict_encode64(content)}"
    rescue StandardError => e
      Rails.logger.error("Failed to load polymer shape SVG #{template[:icon_name]}: #{e.message}")
      nil
    end
  end
  # rubocop:enable Rails/Output
end
