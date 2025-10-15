# frozen_string_literal: true

module Chemotion
  # A class to decorate Chemdraw SVG
  class KetcherSvgProcessor
    attr_accessor :margins, :remove_internal_transform
    attr_reader :min, :max, :svg, :shift

    def initialize(svg = '', **_options)
      File.write('input.svg', svg)
      @svg = Nokogiri::XML(svg)
    end

    def centered_and_scaled_svg
      File.write('output.svg', @svg.to_xml)
      @svg
    end
  end
end
