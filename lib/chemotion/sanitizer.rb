# frozen_string_literal: true

module Chemotion
  class Sanitizer
    class << self
      def scrub_xml(fragment, **options)
        base_scrub_ml(fragment, **options, type: :xml)
      end

      def scrub_html(fragment, **options)
        base_scrub_ml(fragment, **options, type: :html)
      end

      def scrub_svg(fragment, **options)
        base_scrub_ml(fragment, **options, type: :svg)
      end

      private

      def allow_image_tag
        # Allow the <img> tag and all its attributes
        Loofah::Scrubber.new do |node|
          if node.name == 'img'
            node.attributes.each do |attr_name, attr_value|
              node[attr_name] = attr_value.value
            end
          end
        end
      end

      def base_scrub_ml(fragment, type: :xml, encoding: nil, remap_glyph_ids: false)
        result = encoding ? fragment.encode(encoding) : fragment

        # Loofah will remove node having rgb function as value in svg
        # though rgb is an allowed css function
        result = transform_rgb_to_hex(result)
<<<<<<< HEAD
        result =
          case type
          when :xml
            Loofah.scrub_xml_fragment(result, :strip)
          when :html
            Loofah.scrub_html5_fragment(result, :strip)
          else
            if Loofah.fragment(result).css('image').any?
              scrubber = allow_image_tag
              Loofah.fragment(result).scrub!(scrubber)
            else
              Loofah.scrub_fragment(result, :strip)
            end
          end.to_s

=======
        result = case type
                 when :xml
                   Loofah.scrub_xml_fragment(result, :strip)
                 when :html
                   Loofah.scrub_html5_fragment(result, :strip)
                 when :svg
                   Chemotion::SvgSanitizer.sanitize(result)
                 else
                   Loofah.scrub_fragment(result, :strip)
                 end.to_s
        # Fix some camelcase attributes
>>>>>>> 46dd3f1e2 (svg scruber loofah replace with Nokogiri, svg id_suffix limited glyph ids)
        result = camelcase_attributes(result)
        result = new(result).transform_defs_glyph_ids_and_references if remap_glyph_ids
        result
      end

      # Fix camelcasing attributes for proper display of svgs:
      # due to the scrubber library lowercasing all attribute names some properties
      # are not rendered in the browser.
      def camelcase_attributes(value)
        value.gsub('viewbox', 'viewBox')
             .gsub('lineargradient', 'linearGradient')
             .gsub('radialgradient', 'radialGradient')
      end

      # Replace rgb() CSS function with hex fallback (black)
      def transform_rgb_to_hex(value)
        value.gsub(/="rgb\([^)]+\)"/, '="#000000"')
      end
    end

    attr_reader :doc, :id_map

    def initialize(fragment)
      @doc = Nokogiri::XML(fragment)
      @id_map = {}
    end

    def transform_defs_glyph_ids_and_references
      parent_nodes_to_defs.each do |parent_node|
        @current_node = parent_node
        map_defs_ids
        update_references
      ensure
        @current_node = nil
      end
      @doc.to_xml
    end

    private

    def svg_namespace
      { 'svg' => 'http://www.w3.org/2000/svg' }
    end

    def parent_nodes_to_defs
      @parent_nodes_to_defs ||= doc.xpath('//*[svg:defs]', svg_namespace)
    end

    def map_defs_ids
      @current_node.xpath('svg:defs//svg:g[@id]', svg_namespace).each do |element|
        # Check if the element has an id attribute or skip if it has a unique id ending
        # (from SecureRandom.hex(4))
        next if !element['id'] || element['id'].exclude?('glyph') || element['id'].match?(/_[0-9a-f]{8}$/)

        new_id = "#{element['id']}_#{SecureRandom.hex(4)}"
        @id_map[element['id']] = new_id
        element['id'] = new_id
      end
    end

    def update_references
      @current_node.xpath('.//svg:use', svg_namespace).each do |use_element|
        href = use_element['xlink:href']
        next unless href&.start_with?('#')

        old_id = href[1..]
        next if (new_id = id_map[old_id]).blank?

        use_element['xlink:href'] = "##{new_id}"
      end
    end
  end
end
