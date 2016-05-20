module Chemotion
  class MoleculeAPI < Grape::API
    include Grape::Kaminari

    resource :molecules do

      desc "Return molecule by Molfile"
      params do
        requires :molfile, type: String, desc: "Molecule molfile"
        optional :svg_file, type: String, desc: "Molecule svg file"
      end
      post do
        svg = params[:svg_file]
        molfile = params[:molfile]
        is_part = molfile.include? ' R# '

        # write temporary SVG for polymers
        if is_part && svg.present?
          processor = Ketcherails::SVGProcessor.new svg, width: 90, height: 90
          svg = processor.centered_and_scaled_svg

          digest = Digest::SHA256.hexdigest molfile
          digest = Digest::SHA256.hexdigest digest
          svg_file_name = "TMPFILE#{digest}.svg"
          svg_file_path = "public/images/samples/#{svg_file_name}"

          svg_file = File.new(svg_file_path, 'w+')
          svg_file.write(svg)
          svg_file.close
        end

        molecule = Molecule.find_or_create_by_molfile(molfile, is_part)

        molecule.attributes.merge({ temp_svg: svg_file_name })
      end
    end
  end
end
