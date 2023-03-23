# frozen_string_literal: true

require 'digest'

module SVG
  # SVG Processor
  class Processor
    def structure_svg(editor, svg, hexdigest, is_centered = false)
      processor = case editor
                  when /marvinjs/i
                  when /ketcher2/i
                    Chemotion::MarvinjsSvgProcessor.new(svg)
                  when /chemdraw/i
                    Chemotion::ChemdrawSvgProcessor.new(svg)
                  when /ketcher/i
                    Ketcherails::SVGProcessor.new(svg)
                  else
                    Chemotion::OpenBabelSvgProcessor.new(svg)
                  end
      svg = processor.centered_and_scaled_svg unless is_centered == true
      info = generate_svg_info('samples', hexdigest)
      svg_file = File.new(info[:svg_file_path], 'w+')
      svg_file.write(svg)
      svg_file.close
      { svg_file_path: info[:svg_file_path], svg_file_name: info[:svg_file_name] }
    end

    def generate_svg_info(type, hexdigest)
      digest = Digest::SHA256.hexdigest hexdigest
      digest = Digest::SHA256.hexdigest digest
      svg_file_name = "TMPFILE#{digest}.svg"
      svg_file_path = File.join('public', 'images', type, svg_file_name)
      { svg_file_path: svg_file_path, svg_file_name: svg_file_name }
    end
  end
end
