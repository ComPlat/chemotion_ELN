module Chemotion
  class MoleculeAPI < Grape::API
    include Grape::Kaminari

    resource :molecules do
      namespace :smiles do
        desc 'Return molecule by SMILES'
        params do
          requires :smiles, type: String, desc: 'Input SMILES'
          optional :svg_file, type: String, desc: 'Molecule svg file'
          optional :layout, type: String, desc: 'Molecule molfile layout'
        end

        post do
          smiles = params[:smiles]
          svg = params[:svg_file]

          babel_info = OpenBabelService.molecule_info_from_structure(smiles, 'smi')
          inchikey = babel_info[:inchikey]
          return {} unless inchikey

          molecule = Molecule.find_by(inchikey: inchikey, is_partial: false)
          unless molecule
            molfile = babel_info[:molfile] if babel_info
            begin
              rw_mol = RDKitChem::RWMol.mol_from_smiles(smiles)
              rd_mol = rw_mol.mol_to_mol_block  unless rw_mol.nil?
            rescue StandardError => e
              Rails.logger.error ["with smiles: #{smiles}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
              rd_mol = rw_mol.mol_to_mol_block(true, -1, false) unless rw_mol.nil?
            end
            if rd_mol.nil?
              begin
                pc_mol = Chemotion::PubchemService.molfile_from_smiles(smiles)
                pc_mol = Chemotion::OpenBabelService.molfile_clear_hydrogens(pc_mol) unless pc_mol.nil?
                molfile = pc_mol unless pc_mol.nil?
              rescue StandardError => e
                Rails.logger.error ["with smiles: #{smiles}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
              end
            else
              molfile = rd_mol
            end

            return {} unless molfile

            molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
          end
          return unless molecule

          # write temporary SVG
          digest = Digest::SHA256.hexdigest "#{molecule.inchikey}#{Time.now}"
          digest = Digest::SHA256.hexdigest digest
          svg_file_name = "TMPFILE#{digest}.svg"
          svg_file_path = File.join('public','images', 'samples', svg_file_name)
          if (svg)
            processor = Chemotion::ChemdrawSvgProcessor.new svg
            svg = processor.centered_and_scaled_svg
            svg_file = File.new(svg_file_path, 'w+')
            svg_file.write(svg)
            svg_file.close
          else
            svg_file_src = Rails.public_path.join('images', 'molecules', molecule.molecule_svg_file)
            if File.exist?(svg_file_src)
              mol = molecule.molfile.lines[0..1]
              if mol[1]&.strip&.match?('OpenBabel')
                svg = File.read(svg_file_src)
                ob_processor = Chemotion::OpenBabelSvgProcessor.new svg
                svg = ob_processor.imitate_ketcher_svg
                svg_file = File.new(svg_file_path, 'w+')
                svg_file.write(svg.to_xml)
                svg_file.close
              else
                FileUtils.cp(svg_file_src, svg_file_path)
              end
            end
          end
          molecule.attributes.merge({ temp_svg: File.exist?(svg_file_path) && svg_file_name, ob_log: babel_info[:ob_log] })
        end
      end

      namespace :compute do
        desc 'Compute molecule by SMILES'
        params do
          requires :sampleId, type: Integer, desc: 'Sample ID'
        end

        post do
          cconfig = Rails.configuration.compute_config
          uid = current_user.id
          error!('No computation configuration!') if cconfig.nil?
          error!('Unauthorized') unless cconfig.allowed_uids.include?(uid)

          sample = Sample.find(params[:sampleId])
          error!(204) if sample.nil?

          cp = ComputedProp.new
          cp.status = 0
          cp.sample_id = sample.id
          cp.molecule_id = sample.molecule.id
          cp.creator = uid
          cp.save!

          if cp.status == 'pending'
            options = {
              timeout: 10,
              headers: { 'Content-Type' => 'application/json' },
              body: {
                hmac_secret: cconfig.hmac_secret,
                smiles: sample.molecule_cano_smiles,
                compute_id: cp.id
              }.to_json
            }

            req = HTTParty.post(cconfig.server, options)
            cp.task_id = req.parsed_response["taskID"] if req.created?
            cp.status = 'pending'
          end

          cp.save!

          Message.create_msg_notification(
            channel_subject: Channel::COMPUTED_PROPS_NOTIFICATION,
            message_from: uid,
            data_args: { sample_id: sample.id, status: 'started' },
            cprop: cp, level: 'info'
          )
        end
      end

      namespace :decouple do
        desc 'decouple from molecule'
        params do
          optional :molfile, type: String, desc: 'molfile'
          optional :svg_name, type: String, desc: 'original svg filename'
          requires :decoupled, type: Boolean, desc: 'decouple from molecule'
        end
        post do
          molfile = params[:molfile]
          svg_name = params[:svg_name]
          decoupled = params[:decoupled]

          if decoupled && molfile.blank?
            molecule = Molecule.find_or_create_dummy
            ob = ''
          else
            molecule = Molecule.find_or_create_by_molfile(molfile)
            ob = molecule&.ob_log
          end
          molecule.attributes.merge(temp_svg: svg_name, ob_log: ob)
        end
      end

      desc 'Return molecule by Molfile'
      params do
        requires :molfile, type: String, desc: 'Molecule molfile'
        optional :svg_file, type: String, desc: 'Molecule svg file'
        optional :editor, type: String, desc: 'SVGProcessor'
      end
      post do
        svg = params[:svg_file]
        molfile = params[:molfile]
        processor = params[:editor] == 'editor-marvinjs' ? Chemotion::MarvinjsSvgProcessor.new(svg) : Ketcherails::SVGProcessor.new(svg)
        svg = processor.centered_and_scaled_svg

        digest = Digest::SHA256.hexdigest molfile
        digest = Digest::SHA256.hexdigest digest
        svg_file_name = "TMPFILE#{digest}.svg"
        svg_file_path = "public/images/samples/#{svg_file_name}"

        svg_file = File.new(svg_file_path, 'w+')
        svg_file.write(svg)
        svg_file.close

        molecule = Molecule.find_or_create_by_molfile(molfile)
        ob = molecule&.ob_log
        molecule&.attributes&.merge(temp_svg: svg_file_name, ob_log: ob)
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

      desc 'return molecule by InChiKey'
      params do
        requires :inchikey, type: String, desc: 'InChiKey of molecule'
      end
      post :inchikey do
        molecule = Molecule.find_by(inchikey: params[:inchikey])
        present molecule, with: Entities::MoleculeEntity, root: 'molecule'
      rescue StandardError => e
        return {}
      end

      desc 'delete a molecule name'
      params do
        requires :id, type: Integer, desc: 'id of molecule name'
      end
      post :delete_name do
        error!('Unauthorized to delete molecule name!', 401) unless current_user&.molecule_editor
        mn = MoleculeName.find(params[:id])
        mn.destroy! if mn.present?
      rescue StandardError => e
        return {}
      end

      desc 'create or update a molecule name'
      params do
        requires :id, type: Integer, desc: 'id of molecule'
        requires :name_id, type: Integer, desc: 'id of molecule name'
        requires :name, type: String, desc: 'name of molecule name'
        requires :description, type: String, desc: 'description of molecule name'
      end
      post :save_name do
        error!('Unauthorized to delete molecule name!', 401) unless current_user&.molecule_editor

        if params[:name_id] == -1
          mn = MoleculeName.create(molecule_id: params[:id], user_id: current_user.id, description: "#{params[:description]} #{current_user.id}", name: params[:name])
        else
          mn = MoleculeName.find(params[:name_id])
          mn.update!(name: params[:name]) if mn.present?
        end
        mn
      rescue StandardError => e
        return {}
      end

      desc 'return svg path'
      params do
        requires :id, type: Integer, desc: 'Molecule ID'
        requires :svg_file, type: String, desc: 'SVG raw file'
        requires :is_chemdraw, type: Boolean, desc: 'is chemdraw file?'
      end
      post :svg do
        svg = params[:svg_file]
        processor = Ketcherails::SVGProcessor.new svg unless params[:is_chemdraw]
        processor = Chemotion::ChemdrawSvgProcessor.new svg if params[:is_chemdraw]
        svg = processor.centered_and_scaled_svg
        molecule = Molecule.find(params[:id])
        molecule.attach_svg(svg)
        { svg_path: molecule.molecule_svg_file }
      rescue StandardError => e
        return { msg: { level: 'error', message: e } }
      end

      desc 'update molfile and svg of molecule'
      params do
        requires :id, type: Integer, desc: 'Molecule ID'
        requires :molfile, type: String, desc: 'Molecule molfile'
        requires :svg_file, type: String, desc: 'Molecule svg file'
      end
      post :editor do
        error!({ msg: { level: 'error', message: '401 Unauthorized' } }, 401) unless current_user&.molecule_editor
        molecule = Molecule.find(params[:id])
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(params[:molfile])
        inchikey = babel_info && babel_info[:inchikey]
        return { msg: { level: 'error', message: 'The InChIKey will be changed to ' + inchikey.to_s + ' . Record update failed!' } } unless inchikey.present? && molecule.inchikey == inchikey

        molecule.molfile = params[:molfile]
        molecule.molecule_svg_file = params[:svg_file]
        molecule.save!
        return { msg: { level: 'info', message: 'Record updated successfully!' }, molecule: molecule }
      rescue StandardError => e
        return { msg: { level: 'error', message: e } }
      end
    end
  end
end
