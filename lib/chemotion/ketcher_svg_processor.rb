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
      @svg.search('text').each do |text|
        text['xml:space'] = ''
      end
      bg = @svg.at_css('svg')['style']
      if bg&.match?(/background-color/)
        bg = bg.concat('; background-color: unset;')
        @svg.at_css('svg')['style'] = bg
      end
      viewBox = @svg.at_css('svg')['viewBox']
      viewBoxDim = viewBox.split(' ')
      @svg.at_css('svg')['viewBox'] = format('%i %i %f %f', 0, 0, viewBoxDim[2].to_f, viewBoxDim[3].to_f)
      g_node = @svg.at_css('//g')
      unless g_node.nil?
        g_node['transform'] =
          format('translate(%f,%f)', viewBoxDim[0].to_f * -1, viewBoxDim[1].to_f * -1)
      end
      File.write('output.svg', @svg.to_xml)
      @svg
    end
  end
end
