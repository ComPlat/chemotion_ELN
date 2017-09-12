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

        # write temporary SVG
        processor = Ketcherails::SVGProcessor.new svg
        svg = processor.centered_and_scaled_svg

        digest = Digest::SHA256.hexdigest molfile
        digest = Digest::SHA256.hexdigest digest
        svg_file_name = "TMPFILE#{digest}.svg"
        svg_file_path = "public/images/samples/#{svg_file_name}"

        svg_file = File.new(svg_file_path, 'w+')
        svg_file.write(svg)
        svg_file.close

        is_part = molfile.include? ' R# '
        molecule = Molecule.find_or_create_by_molfile(molfile, is_part)

        molecule.attributes.merge({ temp_svg: svg_file_name })
      end

      desc "return CAS of the molecule"
      params do
        requires :inchikey, type: String, desc: "Molecule inchikey"
      end
      get :cas do
        inchikey = params[:inchikey]
        molecule = Molecule.find_by(inchikey: inchikey)
        molecule.load_cas if molecule
        molecule
      end

      desc 'return names of the molecule'
      params do
        requires :inchikey, type: String, desc: 'Molecule inchikey'
        optional :new_name, type: String, desc: 'New molecule_name'
      end
      get :names do
        inchikey = params[:inchikey]
        new_name = params[:new_name]

        mol = Molecule.find_by(inchikey: inchikey)
        return [] if mol.blank?

        user_id = current_user.id
        mol.create_molecule_name_by_user(new_name, user_id) if new_name.present?

        mol.molecule_names.map do |mn|
          { id: mn.id, name: mn.name }
        end
      end
    end
  end
end
