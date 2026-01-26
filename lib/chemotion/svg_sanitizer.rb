# frozen_string_literal: true

require 'nokogiri'

module Chemotion
  class SvgSanitizer
    BLOCKED_TAGS = %w[
      script foreignobject iframe embed object audio video style link meta
    ].freeze

    BLOCKED_ATTRIBUTES = %w[
      onabort onclick ondblclick onerror onfocus onkeydown onkeypress
      onkeyup onload onmousedown onmousemove onmouseout onmouseover
      onmouseup onreset onresize onscroll onselect onsubmit onunload
      onchange oninput onanimationstart onanimationend onanimationiteration
      onblur oncancel oncanplay oncontextmenu
    ].freeze

    BLOCKED_SCHEMES = %w[javascript vbscript livescript mocha file about mhtml].freeze
    SAFE_DATA_MIME_TYPES = %w[image/png image/jpeg image/jpg image/gif image/svg+xml image/webp].freeze

    class << self
      def sanitize(svg_string)
        doc = parse_svg(svg_string)
        clean_document(doc)
        format_output(doc)
      end

      private

      def parse_svg(svg_string)
        Nokogiri::XML(svg_string, &:recover)
      end

      def clean_document(doc)
        doc.traverse { |node| process_node(node) }
      end

      def process_node(node)
        return unless node.element?

        return node.remove if blocked_tag?(node)

        clean_attributes(node)
      end

      def blocked_tag?(node)
        BLOCKED_TAGS.include?(node.name.downcase)
      end

      def clean_attributes(node)
        node.attribute_nodes.each { |attr| check_and_clean_attribute(node, attr) }
      end

      def check_and_clean_attribute(node, attr)
        attribute = AttributeValidator.new(attr)
        return unless attribute.valid?

        remove_if_dangerous(node, attribute)
      end

      def remove_if_dangerous(node, attribute)
        node.remove_attribute(attribute.name) if attribute.dangerous?
      end

      def format_output(doc)
        doc.to_xml(save_with: Nokogiri::XML::Node::SaveOptions::NO_DECLARATION)
      end
    end

    # Encapsulates attribute validation logic
    class AttributeValidator
      attr_reader :name, :value

      def initialize(attr)
        @name = attr.name.downcase
        @value = attr.value.to_s.strip
      end

      def valid?
        name && value
      end

      def dangerous?
        dangerous_name? || dangerous_value?
      end

      private

      def dangerous_name?
        name.start_with?('on') || BLOCKED_ATTRIBUTES.include?(name)
      end

      def dangerous_value?
        dangerous_scheme? || contains_javascript?
      end

      def dangerous_scheme?
        return false unless value =~ /\A([a-z0-9+-]+):/i

        scheme = ::Regexp.last_match(1).downcase
        return false if safe_data_uri?(scheme)

        BLOCKED_SCHEMES.include?(scheme)
      end

      def safe_data_uri?(scheme)
        return false unless scheme == 'data'

        # Check if it's a safe image MIME type: data:image/png;base64,...
        SAFE_DATA_MIME_TYPES.any? { |mime| value.start_with?("data:#{mime}") }
      end

      def contains_javascript?
        value.match?(/\bjavascript\s*:/i)
      end
    end
  end
end
