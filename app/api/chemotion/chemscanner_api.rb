# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  require 'open3'
  require 'ole/storage'
  require 'json'

  # API for ChemScanner manipulation
  class ChemscannerAPI < Grape::API
    helpers ChemscannerHelpers
    format :json

    resource :chemscanner do
      desc 'Update reaction reagent_smiles'
      params do
        requires :reactionId, type: Integer, desc: 'Reaction ID'
        requires :updateInfo, type: Hash do
          requires :add, type: Array[String], desc: 'Smiles to add'
          requires :remove, type: Array[String], desc: 'Smiles to remove'
        end
      end
      post 'reagent_smiles' do
        reaction_id = params[:reactionId]

        reaction = Chemscanner::Reaction.find_by_id(reaction_id)
        return {} if reaction.nil?

        add_smiles = params[:updateInfo][:add].reject(&:empty?)
        remove_smiles = params[:updateInfo][:remove]

        reagents = reaction.add_reagent_smiles(add_smiles)
        ids = reaction.remove_reagent_smiles(remove_smiles)
        reaction.reload

        serialized_reaction = {
          id: reaction.id,
          svg: build_reaction_svg(reaction),
          removedIds: ids,
          reagentExternalIds: reaction.reagents.map(&:external_id)
        }

        serialized_molecules = reagents.map do |m|
          Chemscanner::MoleculeSerializer.new(m).serializable_hash
        end

        { reaction: serialized_reaction, molecules: serialized_molecules }
      end

      resource :abbreviations do
        params do
          requires :newAbb, type: Boolean, desc: 'Abbreviation or superatom'
        end

        post 'add' do
          if params['newAbb']
            added = ChemScanner.add_abbreviation(params['abb'], params['smiles'])
          else
            added = ChemScanner.add_superatom(params['abb'], params['smiles'])
            ChemScanner.sync_custom_superatom
          end

          added
        end

        post 'remove' do
          abb = params.dig('data', 'abb')

          if params['newAbb']
            removed = ChemScanner.remove_abbreviation(abb)
          else
            removed = ChemScanner.remove_superatom(abb)
            ChemScanner.sync_custom_superatom
          end

          removed
        end
      end
    end

    resource :chemscanner_storage do
      post 'upload' do
        sources = params.reduce([]) do |arr, (uid, file)|
          source = Chemscanner::Source.create_from_uploaded_file(file, uid, current_user)
          source.save!
          next arr.push(source)
        rescue StandardError => e
          Rails.logger.error("Error while parsing: #{e}")
          []
        ensure
          file['tempfile']&.close
          file['tempfile']&.unlink
        end

        serialized_sources = sources.map { |s|
          Chemscanner::SourceSerializer.new(s).serializable_hash
        }

        { files: serialized_sources }
      end

      post 'all' do
        sources = Chemscanner::Source
                  .for_user(current_user.id)
                  .order(created_at: :desc)
        # serialized_sources = sources.map do |s|
        #   Chemscanner::SourceSerializer.new(s).serializable_hash
        # end

        schemes = sources.map(&:schemes).flatten
        reactions = sources.map(&:reactions).flatten
        molecules = sources.map(&:molecules).flatten

        # { files: serialized_sources }
        serialize_storage_outputs(sources, schemes, reactions, molecules)
      end

      post 'get_file_results' do
        uid = current_user.id
        sources = Chemscanner::Source
                  .for_user(uid).order(created_at: :desc)
                  .limit(params[:limit]).offset(params[:offset])

        ids = sources.map(&:id)
        schemes = Chemscanner::Scheme.where(source_id: ids)

        reactions = []
        molecules = []
        schemes.each do |scheme|
          reactions.concat(scheme.reactions)
          molecules.concat(scheme.molecules)
        end

        serialize_storage_outputs([], schemes, reactions, molecules)
      end

      resource 'get_outputs' do
        params do
          requires :ids, type: Array(Integer), desc: 'Item id'
          requires :display, type: String, desc: 'Display type: Reaction/Molecule'
        end

        post do
          type = params['type'] == 'File' ? 'Source' : params['type']
          item_type = "Chemscanner::#{type}"
          return {} unless Kernel.const_defined?(item_type)

          klass = item_type.constantize
          items = params['ids'].map { |id| klass.find_by_id(id) }.compact
          items.select! { |item| item.created_by == current_user.id }
          return {} if items.empty?

          files = []
          schemes = []
          reactions = []
          molecules = []

          if type == 'Scheme'
            sources = items.map(&:source).uniq
            sources.each do |source|
              source_scheme_ids = source.schemes.map(&:id)
              next unless (source_scheme_ids - items).empty?

              files.push(source)
            end

            schemes.concat(items)
          else
            items.each do |item|
              files.concat([item] + item.children)
              item_schemes = item.children.reduce([]) do |arr, child|
                arr.concat(child.schemes)
              end
              item_schemes += item.schemes
              schemes.concat(item_schemes)
            end
          end

          schemes.each do |scheme|
            reactions.concat(scheme.reactions)
            molecules.concat(scheme.molecules)
          end

          serialize_outputs(
            files,
            schemes,
            reactions,
            molecules,
            params['display'] == 'molecules'
          )
        end
      end

      resource 'delete' do
        params do
          requires :ids, type: Array(Integer), desc: 'list id to destroy'
          requires :type, type: String, desc: 'type to destroy: Scheme/Source'
          requires :version, type: String, desc: 'version to destroy'
        end

        post do
          type = params['type'] == 'File' ? 'Source' : params['type']
          item_type = "Chemscanner::#{type}"
          return [] unless Kernel.const_defined?(item_type)

          klass = item_type.constantize
          ids = []
          params['ids'].each do |id|
            item = klass.find_by_id(id)
            next if item.nil? || item.created_by != current_user.id

            res = item.destroy
            ids.push(id) unless res.nil?
          end

          Hash[type, ids]
        end
      end

      resource 'download' do
        params do
          requires :id, type: Integer, desc: 'list id to destroy'
        end

        post do
          id = params['id']
          source = Chemscanner::Source.find_by_id(id)
          return if source.nil? || source.created_by != current_user.id

          file = source.file

          content_type('application/octet-stream')
          header['Content-Disposition'] = 'attachment; filename=' + file.filename
          env['api.format'] = :binary

          file.read_file
        end
      end

      resource 'save_png' do
        params do
          requires :image_list, type: Array
        end

        post do
          png_list = params['image_list']
          Chemscanner::Scheme.save_png(png_list)

          true
        end
      end

      resource 'rescan' do
        params do
          requires :ids, type: Array(Integer)
        end

        post do
          files = params['ids'].map { |id| Chemscanner::Source.find_by_id(id) }.compact
          files.select! { |file| file.created_by == current_user.id }
          return {} if files.empty?

          schemes = []
          new_files = []
          reactions = []
          molecules = []

          files.each do |file|
            new_file = file.schemes.empty? ? file : file.dup
            att = new_file.file
            att.file_path = att.store.path if att.file_path.nil?

            scanned_schemes = new_file.scan
            new_files.concat([new_file] + new_file.children)
            schemes.concat(scanned_schemes)
            scanned_schemes.each do |scheme|
              reactions.concat(scheme.reactions)
              molecules.concat(scheme.molecules)
            end
          end

          new_files.each(&:save)
          schemes.each(&:save)

          serialize_storage_outputs(new_files, schemes, reactions, molecules)
        end
      end

      resource 'scheme_image' do
        params do
          requires :id, type: Integer, desc: 'Scheme ID'
        end

        post do
          scheme = Chemscanner::Scheme.find_by_id(params['id'])
          return '' if scheme.nil? || scheme.created_by != current_user.id

          { image_data: scheme.image_data }
        end
      end

      resource 'approve' do
        params do
          requires :ids, type: Array[Integer], desc: 'Items IDs'
          requires :type, type: String, desc: 'Items type'
          requires :val, type: Boolean, desc: 'Value to set'
        end

        post do
          type = params['type'] == 'File' ? 'Source' : params['type']
          item_type = "Chemscanner::#{type}"
          return {} unless Kernel.const_defined?(item_type)

          ids = params['ids']
          klass = item_type.constantize
          items = ids.map { |id| klass.find_by_id(id) }.compact
          items.select! { |item| item.created_by == current_user.id }
          return {} if items.empty?

          val = params['val']
          files = []
          schemes = []
          reactions = []
          molecules = []

          items.each do |item|
            info = item.approve(val)

            files.concat(info[:file_ids] || [])
            schemes.concat(info[:scheme_ids] || [])
            reactions.concat(info[:reaction_ids] || [])
            molecules.concat(info[:molecule_ids] || [])
          end

          {
            val: val,
            files: files,
            schemes: schemes,
            reactions: reactions,
            molecules: molecules
          }
        end
      end

      resource 'update_metadata' do
        params do
          requires :id, type: Integer, desc: 'Item ID'
          requires :type, type: String, desc: 'Item type'
          requires :data, type: Hash, desc: 'New extended_metadata'
        end

        post do
          type = params['type'] == 'File' ? 'Source' : params['type']
          item_type = "Chemscanner::#{type}"
          return false unless Kernel.const_defined?(item_type)

          klass = item_type.constantize
          item = klass.find_by_id(params['id'])
          return false if item.nil? || item.created_by != current_user.id

          ext_data = params['data']
          item_ext_data = item.extended_metadata
          ext_data.each do |k, v|
            item_ext_data[k] = v
          end
          item.update(extended_metadata: item_ext_data)

          return true
        end
      end

      resource 'set_archived' do
        params do
          requires :ids, type: Array, desc: 'Files IDs'
          requires :value, type: Boolean, desc: 'Archived value'
        end

        post do
          string_val = params['value'].to_s
          query = 'extended_metadata = '
          query += "JSONB_SET(extended_metadata, '{archived}', '#{string_val}', #{string_val})"
          Chemscanner::Source.where(id: params['ids']).update_all(query)

          return true
        end
      end

      resource 'set_expanded' do
        params do
          requires :type, type: String, desc: 'Item Type (File or Scheme)'
          requires :id, type: Integer, desc: 'Item ID'
          requires :value, type: Boolean, desc: 'expanded value'
        end

        post do
          type = params['type'].to_s
          item_type = "Chemscanner::#{type == 'File' ? 'Source' : type}"
          value = params['value']

          item = item_type.constantize.find(params['id'])
          item.extended_metadata['expanded'] = value
          item.save
          item
        end
      end

      resource 'update_output' do
        params do
          requires :id, type: Integer, desc: 'Item ID'
          requires :type, type: String, desc: 'Output type'
          requires :field, type: String, desc: 'Field to update'
          requires :value, type: String, desc: 'Value'
        end

        post do
          type = params['type'][0..-2].camelize
          item_type = "Chemscanner::#{type}"
          return false unless Kernel.const_defined?(item_type)

          klass = item_type.constantize
          item = klass.find_by_id(params['id'])
          return false if item.nil? || item.scheme.created_by != current_user.id

          item.update_attribute(params['field'].to_sym, params['value'])

          return true
        end
      end

      resource 'import' do
        params do
          requires :data, type: Array, desc: 'ChemScanner data'
          requires :collection, type: Hash, desc: 'Collection to import'
          requires :maintainShortLabel, type: Boolean, desc: 'Maintain short label'
        end

        post do
          collection_info = params['collection']
          cid = collection_info[:id]
          new_collection_label = collection_info['newCollection']
          return [] if cid.nil? && new_collection_label.nil?

          uid = current_user.id
          new_collection_info = {
            user_id: uid, label: new_collection_label
          }

          collection = if cid.nil?
                         Collection.create(new_collection_info)
                       else
                         Collection.find_by_id(cid)
                       end

          data = params['data']
          files = data.select { |item| item['type'] == 'File' }
          file_ids = files.map { |f| f['id'] }
          schemes = data.select { |item| item['type'] == 'Scheme' }
          scheme_ids = schemes.map { |f| f['id'] }

          maintain = params['maintainShortLabel']
          Import::FromChemscanner.from_files_and_schemes(
            file_ids,
            scheme_ids,
            uid,
            collection.id,
            maintain
          )

          true
        end
      end

      resource 'toggle_polymer' do
        params do
          requires :moleculeId, type: Integer, desc: 'Molecule Id'
          requires :atomIdx, type: Integer, desc: 'Atom index'
        end

        post do
          molecule = Chemscanner::Molecule.find_by_id(params['moleculeId'])
          return [] if molecule.nil?

          molecule.set_polymer(params['atomIdx'])
        end
      end

      resource 'fetch_svg' do
        params do
          requires :moleculeIds, type: Array[Integer], desc: 'Molecule Id'
          optional :reactionIds, type: Array[Integer], desc: 'Atom index'
        end

        post do
          mids = params['moleculeIds']
          msvg_info = []
          rsvg_info = []

          mids.each do |mid|
            m = Chemscanner::Molecule.find_by_id(mid)
            next [] if m.nil?

            msvg_info.push(
              svg: Chemotion::RdkitService.svg_from_molfile(m.mdl), id: mid
            )

            m.reactions.each do |r|
              rsvg_info.push(id: r.id, svg: build_reaction_svg(r))
            end
          end

          (params['reactionIds'] || []).each do |id|
            r = Chemscanner::Reaction.find_by_id(id)
            next [] if r.nil?

            rsvg_info.push(id: r.id, svg: build_reaction_svg(r))
          end

          { molecules: msvg_info, reactions: rsvg_info }
        end
      end

      resource 'beilstein_export' do
        params do
          requires :ids, type: Array(Integer), desc: 'list id to destroy'
        end

        post do
          version = Chemscanner::Process::CHEMSCANNER_VERSION

          list_base64 = []
          params['ids'].each do |id|
            source = Chemscanner::Source.find_by_id(id)
            filename = source.file.filename
            ext_data = source.extended_metadata

            invalid_source = (
              source.nil? || source.created_by != current_user.id ||
              ext_data.empty? || !filename.end_with?('-article.zip')
            )
            next if invalid_source

            invalid_ext = (
              (ext_data['figures'] || []).empty? &&
              (ext_data['schemes'] || []).empty?
            )
            next if invalid_ext

            valid_ext = ext_data.key?('articleId') && ext_data.key?('doi')
            next unless valid_ext

            article_id = ext_data['articleId']
            export_ext_data = {
              'articleId' => article_id,
              'doi' => ext_data['doi']
            }

            dir_path = Dir.mktmpdir
            source_folder = dir_path + "/#{article_id}"
            Dir.mkdir(source_folder)

            sdf_files = []
            %w[figures schemes].each do |key|
              key_data = []

              ext_data[key].each do |data|
                identifier = data['graphicsIdentifier']

                cdx_source = source.children.detect { |s|
                  cdx_name = s.file.filename
                  extname = File.extname(cdx_name)
                  basename = File.basename(cdx_name, '.cdx')

                  extname == '.cdx' && basename == identifier
                }
                next if cdx_source.nil?

                scheme = cdx_source.schemes.find_by_version(version)
                basename = File.basename(cdx_source.file.filename, '.cdx')

                structures = []
                scheme.molecules.each_with_index do |mol, idx|
                  next unless mol.is_approved

                  inchi, inchikey = OpenBabelService.inchi_info_from_molfile(mol.mdl)
                  next if inchi.empty? || inchikey.empty?

                  sdf_filename = "#{basename}-#{idx + 1}.sdf"
                  sdf_files.push(sdf_filename)

                  sdf_content = [
                    mol.mdl,
                    "\n>  <InChI>\n#{inchi}",
                    "\n>  <InChIKey>\n#{inchikey}"
                  ].join("\n")
                  f = File.new("#{source_folder}/#{sdf_filename}", 'w+')
                  f.write(sdf_content)
                  f.close

                  structures.push(
                    'sequenceNumber' => idx + 1,
                    'InChI' => inchi,
                    'InChIKey' => inchikey,
                    'SDF' => "#{basename}-#{idx + 1}.sdf"
                  )
                end

                key_data.push(
                  'sequenceNumber' => data['sequenceNumber'],
                  'graphicsIdentifier' => identifier,
                  'structures' => structures
                )
              end

              export_ext_data[key] = key_data
            end

            json_path = "#{source_folder}/#{article_id}.json"
            json_file = File.new(json_path, 'w+')
            json_file.write(export_ext_data.to_json)
            json_file.close

            zip_filename = "#{dir_path}/#{article_id}-structures.zip"
            Zip::File.open(zip_filename, Zip::File::CREATE) do |zipfile|
              zipfile.add("#{article_id}.json", json_path)

              sdf_files.each do |sdf_filename|
                zipfile.add(sdf_filename, "#{source_folder}/#{sdf_filename}")
              end
            end

            list_base64.push(
              b64: Base64.encode64(File.read(zip_filename)),
              name: "#{article_id}-structures.zip"
            )
          end

          { files: list_base64 }
        end
      end
    end
  end
end
