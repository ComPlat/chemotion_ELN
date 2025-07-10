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
      height
      href
      id
      mask
      transform
      viewBox
      width
      x
      y
    ]

    def self.sanitize(svg_string)
      doc = Nokogiri::XML(svg_string) { |config| config.recover }
      doc.traverse do |node|
        unless SAFE_TAGS.include?(node.name)
          node.remove
          next
        end
      end

      # Explicitly remove dangerous nodes/attrs
      doc.xpath('//script|//foreignObject|//@onload').each(&:remove)
      doc.to_xml
    end
  end
end
