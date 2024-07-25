# frozen_string_literal: true

module Chemotion
  # A class to decorate Ketcher2 SVG
  class KetcherSvgProcessor
    attr_reader :svg

    def initialize(svg = '')
      @svg = Nokogiri::XML(svg)
    end

    def centered_and_scaled_svg
      v_w = @svg.at_css('svg')['width'].to_f
      v_h = @svg.at_css('svg')['height'].to_f
      @svg.at_css('svg')['viewBox'] = "0 0 #{v_w} #{v_h}"
      # @svg.at_css('svg')['width'] = 15
      # @svg.at_css('svg')['height'] = 15
      Nokogiri::XML(@svg.to_xml)
    end
  end
end
