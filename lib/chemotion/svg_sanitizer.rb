# frozen_string_literal: true

require 'uri'
require 'nokogiri'

module Chemotion
  class SvgSanitizer
    # SAFE_TAGS = %w[
    #   svg
    #   g
    #   path
    #   rect
    #   circle
    #   ellipse
    #   line
    #   polyline
    #   polygon
    #   text
    #   tspan
    #   defs
    #   use
    #   clipPath
    #   symbol
    #   feColorMatrix
    #   filter
    #   feImage
    #   feComposite
    #   mask
    # ]
    SAFE_ATTRIBUTES = %w[
      d fill fill-opacity fill-rule filter font font-size height href id
      mask stroke stroke-linecap stroke-linejoin stroke-miterlimit
      stroke-opacity stroke-width style text-anchor transform version viewBox
      width x y dy xmlns xmlns:xlink xlink:href preserveAspectRatio
      stroke-dasharray clip-path opacity rx ry cx cy r
      in in2 operator values result k1 k2 k3 k4 color-interpolation-filters
      stdDeviation flood-color flood-opacity gradientUnits stop-color
      stop-opacity patternUnits
    ]

    def self.sanitize(svg_string)
      doc = Nokogiri::XML(svg_string) { |config| config.recover }
      doc.traverse do |node|
        # unless SAFE_TAGS.include?(node.name)
        #   node.remove
        #   next
        # end

        node.attribute_nodes.each do |attr|
          attr_name = attr.node_name # includes namespace if present, e.g., "xlink:href"

          unless SAFE_ATTRIBUTES.include?(attr_name)
            attr.remove
            next
          end

          # Remove javascript: URIs (even within styles)
          if %w[href xlink:href].include?(attr.name) && attr.value =~ /^\s*javascript:/i
            attr.remove
            next
          end

          # Sanitize style attribute URLs
          if attr.name == 'style' && attr.value =~ /url\(['"]?\s*javascript:/i
            attr.remove
            next
          end
        end
      end

      # Explicitly remove dangerous nodes/attrs
      doc.xpath('//script|//foreignObject|//@onload').each(&:remove)
      doc.to_xml
    end
  end
end
