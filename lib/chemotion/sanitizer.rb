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

      alias_method :scrub_svg, :scrub_xml

      private

      def base_scrub_ml(fragment, type: :xml, encoding: nil)
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
        value.gsub(/rgb\([^)]+\)/, '#000000')
      end
    end
  end
end
