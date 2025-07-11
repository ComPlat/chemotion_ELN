# frozen_string_literal: true

require 'uri'
require 'nokogiri'

module Chemotion
  class SvgSanitizer
    SAFE_TAGS = %w[
      svg
      g
      path
      rect
      circle
      ellipse
      line
      polyline
      polygon
      text
      tspan
      defs
      use
      clipPath
      symbol
      feColorMatrix
      filter
      feImage
      feComposite
      mask
    ]
    SAFE_ATTRIBUTES = %w[
      d
      fill
      fill-opacity
      fill-rule
      filter
      font
      font-size
      height
      href
      id
      mask
      stroke
      stroke-linecap
      stroke-linejoin
      stroke-miterlimit
      stroke-opacity
      stroke-width
      style
      text-anchor
      transform
      version
      viewBox
      width
      x
      y
      dy
    ]

    def self.sanitize(svg_string)
      doc = Nokogiri::XML(svg_string) { |config| config.recover }
      doc.traverse do |node|
        unless SAFE_TAGS.include?(node.name)
          node.remove
          next
        end

        node.attribute_nodes.each do |attr|
          unless SAFE_ATTRIBUTES.include?(attr.name)
            attr.remove
            next
          end

          # Remove javascript: URIs

          attr.remove if %w[href xlink:href].include?(attr.name) && attr.value =~ /^\s*javascript:/i
        end
      end

      # Explicitly remove dangerous nodes/attrs
      doc.xpath('//script|//foreignObject|//@onload').each(&:remove)
      doc.to_xml
    end
  end
end
