# frozen_string_literal: true

module Chemotion
  # A class to decorate Ketcher2 SVG
  class KetcherSvgProcessor
    attr_reader :svg

    def initialize(svg = '')
      @svg = Nokogiri::XML(svg)
    end

    def centered_and_scaled_svg
      # v_w = @svg.at_css('svg')['width'].to_f
      # v_h = @svg.at_css('svg')['height'].to_f
      # puts v_w, v_h
      # @svg.at_css('svg')['viewBox'] = "0 0 #{v_w} #{v_h}"
      # @svg.at_css('svg')['width'] = 30
      # @svg.at_css('svg')['height'] = 30

      # Ensure scaling factor is between 0 and 1
      scaling_factor = 0.6
      svg_tag = @svg.at_css('svg')
      original_width = svg_tag['width'].to_f
      original_height = svg_tag['height'].to_f

      viewBox = svg_tag['viewBox'].split.map(&:to_f)
      viewBox[2] *= scaling_factor
      viewBox[3] *= scaling_factor

      @svg.at_css('svg')['viewBox'] = viewBox.join(' ')
      @svg.at_css('svg')['width'] = (original_width * scaling_factor).to_s
      @svg.at_css('svg')['height'] = (original_height * scaling_factor).to_s

      # Update all transform attributes within the SVG
      @svg.css('path').each do |path|
        path['d'] = scale_path_data(path['d'], scaling_factor) if path.name == 'path' && path['d']

        next unless path['transform']

        path['transform'] = path['transform'].gsub(/matrix\((.*?)\)/) do |_match|
          values = ::Regexp.last_match(1).split(',').map(&:to_f)
          "matrix(#{values[0] * scaling_factor},#{values[1] * scaling_factor},#{values[2] * scaling_factor},#{values[3] * scaling_factor},#{values[4] * scaling_factor},#{values[5] * scaling_factor})"
        end
      end
      Nokogiri::XML(@svg.to_xml)
    end

    private

    def scale_path_data(data, _scaling_factor)
      modified_d = ''
      data.split do |_match|
        _match = _match.to_f * _scaling_factor if is_number?(_match)
        modified_d += "#{_match} "
      end
      modified_d
    end

    def is_number?(str)
      !!(str =~ /\A\d+(\.\d+)?\z/)
    end
  end
end
