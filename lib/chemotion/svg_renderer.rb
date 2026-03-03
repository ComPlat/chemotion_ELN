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
    # Renders SVG from molfile using the full fallback chain:
    # Indigo -> Ketcher -> OpenBabel
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if all services fail
    def self.render_svg_from_molfile(struct)
      polymer_data = parse_polymer_payload(struct)
      render_struct = polymer_data[:cleaned_struct]

      rendered_svg = indigo_service(render_struct)
      return finalize_svg(rendered_svg, render_struct, polymer_data) if rendered_svg

      rendered_svg = ketcher_service(render_struct)
      return finalize_svg(rendered_svg, render_struct, polymer_data) if rendered_svg

      rendered_svg = open_babel_service(render_struct)
      return finalize_svg(rendered_svg, render_struct, polymer_data) if rendered_svg

      nil
    end

    def self.finalize_svg(svg, molfile, polymer_data)
      with_polymer = inject_polymer_shapes(svg, molfile, polymer_data)
      sanitize_svg(with_polymer || svg)
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
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.indigo_service(struct)
      if IndigoService.disabled?
        puts '❌ IndigoService is disabled, falling back to KetcherService'
        return nil
      end

      rendered_svg = IndigoService.new(struct, 'image/svg+xml', nil).render_structure
      if rendered_svg.present?
        puts '✅ SVG rendered using IndigoService'
        return rendered_svg
      end

      puts '❌ IndigoService returned nil or empty, falling back to KetcherService'
      nil
    end

    # Attempts to render SVG using KetcherService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.ketcher_service(struct)
      if KetcherService.disabled?
        puts '❌ KetcherService is disabled, falling back to OpenBabelService'
        return nil
      end

      rendered_svg = render_svg(struct)
      if rendered_svg.present?
        puts '✅ SVG rendered using KetcherService'
        rendered_svg
      else
        puts 'KetcherService returned nil or empty, falling back to OpenBabelService'
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
        puts '✅ SVG rendered using OpenBabelService'
        rendered_svg
      else
        puts 'OpenBabelService returned nil or empty.'
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
      start_idx = lines.find_index { |line| line.strip == '> <PolymersList>' }
      return '' unless start_idx

      data = []
      idx = start_idx + 1
      while idx < lines.length
        line = lines[idx].strip
        break if line.start_with?('> <') || line == '$$$$'
        data << line unless line.empty?
        idx += 1
      end
      data.join(' ').strip
    end

    def self.parse_polymers_line(polymers_line)
      return [] if polymers_line.blank?

      polymers_line.split(/\s+/).filter_map do |token|
        parts = token.split('/')
        next if parts.size < 3

        atom_index = Integer(parts[0], exception: false)
        template_id = Integer(parts[1], exception: false)
        next if atom_index.nil? || template_id.nil?

        height, width = parse_size(parts[2])
        next unless height && width

        { atom_index: atom_index, template_id: template_id, height: height, width: width }
      end
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

    def self.inject_polymer_shapes(svg, molfile, polymer_data)
      polymers = polymer_data[:polymers]
      return svg if svg.blank? || polymers.blank?

      atom_by_index = parse_atom_positions(molfile)
      return svg if atom_by_index.empty?

      doc = Nokogiri::XML(svg)
      svg_root = doc.at_css('svg')
      return svg unless svg_root

      bounds = find_svg_bounds(svg)
      return svg unless bounds

      mol_bounds = find_mol_bounds(atom_by_index)
      return svg unless mol_bounds

      template_lookup = load_surface_template_lookup
      return svg if template_lookup.empty?

      svg_root['xmlns:xlink'] ||= 'http://www.w3.org/1999/xlink'
      occupied = []
      labels = polymer_data[:text_by_index] || {}

      mol_dx = [(mol_bounds[:max_x] - mol_bounds[:min_x]).abs, 0.001].max
      mol_dy = [(mol_bounds[:max_y] - mol_bounds[:min_y]).abs, 0.001].max
      scale_x = bounds[:sx].abs / mol_dx
      scale_y = bounds[:sy].abs / mol_dy

      polymers.each do |polymer|
        atom_xy = atom_by_index[polymer[:atom_index]]
        next unless atom_xy

        template = template_lookup[polymer[:template_id]]
        next unless template

        icon_data = load_template_svg_data_uri(template)
        next if icon_data.blank?

        x = map_x(atom_xy[0], mol_bounds, bounds)
        y = map_y(atom_xy[1], mol_bounds, bounds)
        width = polymer[:width] * scale_x
        height = polymer[:height] * scale_y
        img_x = x - (width / 2.0)
        img_y = y - (height / 2.0)

        image_node = Nokogiri::XML::Node.new('image', doc)
        image_node['x'] = img_x.round(4).to_s
        image_node['y'] = img_y.round(4).to_s
        image_node['width'] = width.round(4).to_s
        image_node['height'] = height.round(4).to_s
        image_node['preserveAspectRatio'] = 'none'
        image_node['xlink:href'] = icon_data
        image_node['href'] = icon_data
        svg_root.add_child(image_node)

        occupied << { x: img_x, y: img_y, width: width, height: height }

        label = labels[polymer[:atom_index]]
        next if label.blank?

        add_polymer_label(doc, svg_root, label, img_x, img_y, width, height, bounds, occupied)
      end

      doc.to_xml
    rescue StandardError => e
      Rails.logger.error("Polymer SVG injection failed: #{e.message}")
      svg
    end

    def self.add_polymer_label(doc, svg_root, label, img_x, img_y, img_w, img_h, bounds, occupied)
      font_size = [[(img_h * 0.28), 11.0].max, 16.0].min
      text_width = [font_size * 0.6 * label.length, 24.0].max
      padding = [img_w * 0.08, 6.0].max
      baseline_y = img_y + (img_h / 2.0) + (font_size * 0.35)

      right_x = img_x + img_w + padding
      left_x = img_x - padding - text_width

      right_rect = { x: right_x, y: baseline_y - font_size, width: text_width, height: font_size * 1.2 }
      left_rect = { x: left_x, y: baseline_y - font_size, width: text_width, height: font_size * 1.2 }

      right_space = bounds[:max_x] - (right_x + text_width)
      left_space = left_x - bounds[:min_x]
      choose_right = right_space >= left_space

      if choose_right
        choose_right = false if overlaps_any?(right_rect, occupied) && !overlaps_any?(left_rect, occupied)
      elsif overlaps_any?(left_rect, occupied) && !overlaps_any?(right_rect, occupied)
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
      root = doc.at_css('svg')
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

    def self.map_x(x, mol_bounds, svg_bounds)
      mol_dx = mol_bounds[:max_x] - mol_bounds[:min_x]
      return svg_bounds[:min_x] if mol_dx.abs <= 0.0001

      ratio = (x - mol_bounds[:min_x]) / mol_dx
      svg_bounds[:min_x] + (ratio * svg_bounds[:sx])
    end

    def self.map_y(y, mol_bounds, svg_bounds)
      mol_dy = mol_bounds[:max_y] - mol_bounds[:min_y]
      return svg_bounds[:min_y] if mol_dy.abs <= 0.0001

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
