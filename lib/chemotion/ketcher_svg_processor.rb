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
      clear_text_xml_space
      unset_background_color_if_present
      adjust_view_box_and_transform
      File.write('output.svg', @svg.to_xml)
      @svg
    end

    private

    def clear_text_xml_space
      @svg.search('text').each do |text|
        text['xml:space'] = ''
      end
    end

    def unset_background_color_if_present
      bg = @svg.at_css('svg')['style']
      return unless bg&.include?('background-color')

      bg.concat('; background-color: unset;')
      @svg.at_css('svg')['style'] = bg
    end

    def adjust_view_box_and_transform
      svg_node = @svg.at_css('svg')
      view_box = svg_node['viewBox']
      view_box_dim = view_box.split
      width = view_box_dim[2].to_f
      height = view_box_dim[3].to_f

      svg_node['viewBox'] = format(
        '%<x>i %<y>i %<w>f %<h>f',
        x: 0, y: 0, w: width, h: height,
      )

      g_node = @svg.at_css('//g')
      return if g_node.nil?

      translate_x = view_box_dim[0].to_f * -1
      translate_y = view_box_dim[1].to_f * -1
      g_node['transform'] = format('translate(%<x>f,%<y>f)', x: translate_x, y: translate_y)
    end
  end
end
