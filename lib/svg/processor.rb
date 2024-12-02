# frozen_string_literal: true

require 'digest'

module SVG
  # SVG Processor
  class Processor
    def initialize(svg, editor, molecule)
      @svg = svg
      @editor = editor
      @molecule = molecule
    end

    def process
      svg_digest = generate_svg_digest(@molecule)
      if @svg.present?
        structure_svg(@editor, @svg, svg_digest)
      else
        regenerate_or_copy_svg(svg_digest)
      end
    end

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
      save_svg_to_file(svg, generate_svg_info('samples', hexdigest))
    end

    private

    def generate_svg_info(type, hexdigest)
      digest = Digest::SHA256.hexdigest hexdigest
      digest = Digest::SHA256.hexdigest digest
      svg_file_name = "TMPFILE#{digest}.svg"
      svg_file_path = File.join('public', 'images', type, svg_file_name)
      { svg_file_path: svg_file_path, svg_file_name: svg_file_name }
    end

    def regenerate_or_copy_svg(hexdigest)
      svg_file_src = generate_svg_file_src
      if svg_file_src && svg_file_exists?(svg_file_src)
        info = generate_svg_info('samples', hexdigest)
        needs_reprocessing? ? regenerate_svg(hexdigest) : copy_svg_file(svg_file_src, info)
      else
        generate_svg_info('samples', hexdigest)
      end
    end

    def generate_svg_file_src
      return if @molecule.molecule_svg_file.blank?

      Rails.public_path.join('images', 'molecules', @molecule.molecule_svg_file)
    end

    def svg_file_exists?(svg_file_src)
      File.exist?(svg_file_src)
    end

    def needs_reprocessing?
      @svg.nil? || @svg.include?('Open Babel')
    end

    def save_svg_to_file(svg, info)
      File.write(info[:svg_file_path], svg)
      { svg_file_path: info[:svg_file_path], svg_file_name: info[:svg_file_name] }
    end

    def regenerate_svg(hexdigest)
      svg = Molecule.svg_reprocess(@svg, @molecule.molfile)
      structure_svg(@editor, svg, hexdigest, true)
    end

    def copy_svg_file(src, info)
      FileUtils.cp(src, info[:svg_file_path])
      info
    end

    def generate_svg_digest(molecule)
      "#{molecule.inchikey}#{Time.current}"
    end
  end
end
