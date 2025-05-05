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

      def base_scrub_ml(fragment, type: :xml, encoding: nil, remap_glyph_ids: false)
        result = encoding ? fragment.encode(encoding) : fragment

        # Loofah will remove node having rgb function as value in svg
        # though rgb is an allowed css function
        result = transform_rgb_to_hex(result)
        result = case type
                 when :xml
                   Loofah.scrub_xml_fragment(result, :strip)
                 when :html
                   Loofah.scrub_html5_fragment(result, :strip)
                 else
                   Loofah.scrub_fragment(result, :strip)
                 end.to_s
        # Fix some camelcase attributes
        result = camelcase_attributes(result)
        result = new(result).transform_defs_glyph_ids_and_references if remap_glyph_ids
        result
      end

      # Fix camelcasing attributes for proper display of svgs:
      # due to the scrubber library lowercasing all attribute names some properties
      # are not rendered in the browser.
      # Successiv gsub seems to be faster than a single gsub with a regexp with multiple matches
      def camelcase_attributes(value)
        value.gsub('viewbox', 'viewBox')
             .gsub('lineargradient', 'linearGradient')
             .gsub('radialgradient', 'radialGradient')
      end

      # replace rgb func by hex black value
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
      @current_node.xpath('svg:defs//*[@id]', svg_namespace).each do |element|
        # Check if the element has an id attribute or skip if it has a unique id ending
        # (from SecureRandom.hex(4))
        next if !element['id'] || element['id'].match?(/_[0-9a-f]{8}$/)

        # Generate a new id, store the mapping, and update the element's id
        new_id = "#{element['id']}_#{SecureRandom.hex(4)}"
        @id_map[element['id']] = new_id
        element['id'] = new_id
      end
    end

    def update_references
      @current_node.xpath('.//svg:use', svg_namespace).each do |use_element|
        href = use_element['xlink:href']
        next unless href&.start_with?('#')

        old_id = href[1..] # Remove the leading '#'
        next if (new_id = id_map[old_id]).blank?

        # Update the xlink:href attribute with the new id
        use_element['xlink:href'] = "##{new_id}" if new_id
      end
    end
  end
end
