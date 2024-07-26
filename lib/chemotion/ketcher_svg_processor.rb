# frozen_string_literal: true

module Chemotion
  # A class to decorate Ketcher2 SVG
  class KetcherSvgProcessor
    attr_reader :svg

    def initialize(svg = '')
      @svg = Nokogiri::XML(svg)
      5.times { puts 'ketcher2/n' }
    end

    def centered_and_scaled_svg
      # v_w = @svg.at_css('svg')['width'].to_f
      # v_h = @svg.at_css('svg')['height'].to_f
      # puts v_w, v_h
      # @svg.at_css('svg')['viewBox'] = "0 0 #{v_w} #{v_h}"
      # @svg.at_css('svg')['width'] = 30
      # @svg.at_css('svg')['height'] = 30

      # Ensure scaling factor is between 0 and 1
      scaling_factor = 1.5
      svg_tag = @svg.at_css('svg')
      # original_width = svg_tag['width'].to_f
      # original_height = svg_tag['height'].to_f
      # svg_tag['width'] = (original_width * scaling_factor).to_s
      # svg_tag['height'] = (original_height * scaling_factor).to_s

      # viewBox = svg_tag['viewBox'].split.map(&:to_f)
      # viewBox[2] *= scaling_factor
      # viewBox[3] *= scaling_factor
      # svg_tag['viewBox'] = viewBox.join(' ')

      # Update all transform attributes within the SVG
      true && @svg.css('path').each do |path|
        next unless path['transform']

        path['d'] = scale_path_data(path['d'], scaling_factor) if path.name == 'path' && path['d']
        puts '-----------------', path['d']
        # path['transform'] = path['transform'].gsub(/matrix\((.*?)\)/) do |_match|
        #   values = ::Regexp.last_match(1).split(',').map(&:to_f)
        #   "matrix(#{values[0] * scaling_factor},#{values[1] * scaling_factor},#{values[2] * scaling_factor},#{values[3] * scaling_factor},#{values[4] * scaling_factor},#{values[5] * scaling_factor})"
        # end
      end

      Nokogiri::XML(@svg.to_xml)
    end

    private

    def scale_path_data(data, _scaling_factor)
      modified_d = ''
      data.split do |_match|
        if _match.to_f.nan? && _match.positive?
          _match *= _scaling_factor
        else
          modified_d += "#{_match} "
        end
      end
      modified_d
    end
  end
end
