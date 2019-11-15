# frozen_string_literal: true

module Chemotion
  # A class to decorate Open Babel SVG
  class OpenBabelSvgProcessor
    attr_reader :svg

    def initialize(svg = '')
      @svg = Nokogiri::XML(svg)
    end

    def remove_rect(svg)
      svg.search('rect').each do |rect|
        rect.remove if [rect['x'], rect['y'], rect['width'], rect['height'], rect['fill']] == %w[0 0 100 100 white]
      end
    end

    def decorate_text(svg)
      svg.search('text').each do |text|
        text.remove_attribute('xml:space')
        text['font'] = "#{text['font-size']}px Arial"
        text['style'] = "text-anchor: middle; font: #{text['font-size']}px Arial;"
        text['transform'] = ''
        text['stroke'] = 'none'
      end
    end

    def imitate_ketcher_svg
      remove_rect(@svg)
      g_node = @svg.at_css('//g')
      unless g_node.nil?
        g_children = g_node.children
        g_vb = g_children.at_css('svg')['viewBox'].split(' ')
        g_children.at_css('svg')['width'] = g_vb[2].to_f
        g_children.at_css('svg')['height'] = g_vb[3].to_f
        @svg = g_children.at_css('svg')
        @svg['xmlns'] = 'http://www.w3.org/2000/svg'
        @svg['xmlns:xlink'] = 'http://www.w3.org/1999/xlink'
        @svg['version'] = '1.1'
      end
      decorate_text(@svg)
      @svg = Nokogiri::XML(@svg.to_xml)
      @svg
    end
  end
end
