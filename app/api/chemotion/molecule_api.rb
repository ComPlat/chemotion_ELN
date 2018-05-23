module Chemotion
  class MoleculeAPI < Grape::API
    include Grape::Kaminari

    resource :molecules do

      namespace :smiles do
        desc "Return molecule by SMILES"
        params do
          requires :smiles, type: String, desc: "Input SMILES"
          optional :svg_file, type: String, desc: "Molecule svg file"
        end

        post do
          smiles = params[:smiles]
          svg = params[:svg_file]
          inchikey = OpenBabelService.smiles_to_inchikey(smiles)
          return {} unless inchikey
          molecule = Molecule.find_by(inchikey: inchikey, is_partial: false)

          unless molecule
            molfile = OpenBabelService.smiles_to_molfile smiles if smiles
            return {} unless molfile
            molecule = Molecule.find_or_create_by_molfile(molfile)
          end
          return unless molecule

          # write temporary SVG
          digest = Digest::SHA256.hexdigest "#{molecule.inchikey}#{Time.now}"
          digest = Digest::SHA256.hexdigest digest
          svg_file_name = "TMPFILE#{digest}.svg"
          svg_file_path = File.join('public','images', 'samples', svg_file_name)
          svg_file_src = File.join('public','images', 'molecules', molecule.molecule_svg_file)
          FileUtils.cp(svg_file_src, svg_file_path) if File.exist?(svg_file_src)

          molecule.attributes.merge({ temp_svg: File.exist?(svg_file_path) && svg_file_name })
        end
      end

      namespace :compute do
        desc 'Compute molecule by SMILES'
        params do
          requires :smiles, type: String, desc: 'Input SMILES'
          requires :short_label, type: String, desc: 'Sample Short Label'
        end

        post do
          cconfig = Rails.configuration.compute_config
          error!('No computation configuration!') if cconfig.nil?
          error!('Unauthorized') unless cconfig.allowed_uids.include?(current_user.id)

          sample = Sample.where(short_label: params[:short_label]).first
          error!(204) if sample.nil?

          cp = sample.molecule_computed_prop
          if cp.nil?
            cp = ComputedProp.new
            cp.status = 0
            cp.molecule_id = sample.molecule.id
            cp.save!
          end

          if cp.status == 'not_computed'
            options = {
              timeout: 10,
              headers: { 'Content-Type' => 'application/json' },
              body: {
                hmac_secret: cconfig.hmac_secret,
                smiles: params[:smiles],
                name: params[:short_label]
              }.to_json
            }

            HTTParty.post(cconfig.server, options)
            cp.status = 'in_progress'
          end
          cp.save!

          status 200
        end
      end

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

        molecule = Molecule.find_or_create_by_molfile(molfile)

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
          {
            value: mn.id, label: mn.name,
            desc: mn.description, mid: mn.molecule_id
          }
        end
      end
    end
  end
end
