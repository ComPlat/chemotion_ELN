# frozen_string_literal: true

module Chemotion
  class Sanitizer
    class << self
      def scrub_xml(fragment, encoding: nil)
        base_scrub_ml(fragment, type: :xml, encoding: encoding)
      end

      def scrub_html(fragment, encoding: nil)
        base_scrub_ml(fragment, type: :html, encoding: encoding)
      end

      def scrub_svg(fragment, encoding: nil)
        base_scrub_ml(fragment, type: :svg, encoding: encoding)
      end

      private

      def allow_image_tag
        # Allow the <img> tag and all its attributes
        Loofah::Scrubber.new do |node|
          if node.name == 'img'
            # Keep all attributes for <img> tags without self-assignment
            node.attributes.each do |attr_name, attr_value|
              node[attr_name] = attr_value.value
            end
          end
        end
      end

      def base_scrub_ml(fragment, type: :xml, encoding: nil)
        result = encoding ? fragment.encode(encoding) : fragment

        # Allow the <image> tag and all its attributes
        scrubber = allow_image_tag
        # Loofah will remove node having rgb function as value in svg
        # though rgb is an allowed css function
        result = transform_rgb_to_hex(result)
        result = case type
                 when :xml
                   Loofah.scrub_xml_fragment(result, :strip)
                 when :html
                   Loofah.scrub_html5_fragment(result, :strip)
                 else
                   Loofah.fragment(result).scrub!(scrubber)
                 end.to_s
        # Fix some camelcase attributes
        camelcase_attributes(result)
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
  end
end
