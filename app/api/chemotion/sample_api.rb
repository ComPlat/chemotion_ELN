module Chemotion
  class SampleAPI < Grape::API
    include Grape::Kaminari

    resource :samples do

      # TODO Refactoring: Use Grape Entities
      namespace :ui_state do
        desc "Get samples by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected samples from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :collection_id
          end
          optional :limit, type: Integer, desc: "Limit number of samples"
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Sample.for_user(current_user.id).for_ui_state(params[:ui_state])).read?
        end

        # we are using POST because the fetchers don't support GET requests with body data
        post do
          samples = Sample.for_user(current_user.id).for_ui_state(params[:ui_state])
          samples = samples.limit(params[:limit]) if params[:limit]

          {samples: samples.map{|s| SampleSerializer.new(s).serializable_hash.deep_symbolize_keys}}
        end

        desc "Delete samples by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected samples from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :collection_id
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Sample.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Sample.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

      namespace :subsamples do
        desc "Split Samples into Subsamples"
        params do
          requires :ui_state, type: Hash, desc: "Selected samples from the UI"
        end
        post do
          ui_state = params[:ui_state]
          currentCollectionId = ui_state[:currentCollectionId]
          sample_ids = Sample.for_user(current_user.id).for_ui_state_with_collection(ui_state[:sample], CollectionsSample, currentCollectionId)
          Sample.where(id: sample_ids).each do |sample|
            #todo: extract method into Sample
            subsample = sample.dup
            subsample.parent = sample
            subsample.created_by = current_user.id
            subsample.save
            CollectionsSample.create(collection_id: currentCollectionId, sample_id: subsample.id)
          end
        end
      end

      namespace :import do
        desc "Import Samples from a File"
        post do
          # Creates the Samples from the XLS/CSV file. Empty Array if not successful
          import = Import::ImportSamples.import_samples_from_file(params[:file].tempfile.path, params[:currentCollectionId], current_user.id)
        end
      end

      desc "Return serialized samples of current user"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 7, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).samples.includes(:molecule)
        else
          # All collection
          Sample.for_user(current_user.id).includes(:molecule).uniq
        end.uniq.order("molecules.iupac_name DESC")

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s).serialized}
      end

      desc "Return serialized sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Sample.find(params[:id])).read?
        end

        get do
          sample = Sample.find(params[:id])
          {sample: ElementPermissionProxy.new(current_user, sample).serialized}
        end
      end

      #todo: move to AttachmentAPI
      desc "Upload attachments"
      post 'upload_dataset_attachments' do
        params.each do |file_id, file|
          if tempfile = file.tempfile
            begin
              upload_path = File.join('uploads', 'attachments', "#{file_id}#{File.extname(tempfile)}")
              upload_dir = File.join('uploads', 'attachments')
              thumbnail_dir = File.join('uploads', 'thumbnails')
              FileUtils.mkdir_p(upload_dir) unless Dir.exist?(upload_dir)
              FileUtils.mkdir_p(thumbnail_dir) unless Dir.exist?(thumbnail_dir)
              FileUtils.cp(tempfile.path, upload_path)
              thumbnail_path = Thumbnailer.create(upload_path)
              FileUtils.mv(thumbnail_path, File.join('uploads', 'thumbnails', "#{file_id}.png"))
            ensure
              tempfile.close
              tempfile.unlink   # deletes the temp file
            end
          end
        end
        true
      end

      #todo: authorize attachment download
      desc "Download the attachment file"
      params do
        optional :filename, type: String
      end
      get 'download_attachement/:attachment_id' do
        file_id = params[:attachment_id]
        filename = params[:filename] || file_id
        content_type "application/octet-stream"
        header['Content-Disposition'] = "attachment; filename=#{filename}"
        env['api.format'] = :binary
        File.open(File.join('uploads', 'attachments', "#{file_id}#{File.extname(filename)}")).read
      end

      module SampleUpdator

        def self.updated_embedded_analyses(analyses)
          Array(analyses).map do |ana|
            {
              id: ana.id,
              type: ana.type,
              name: ana.name,
              kind: ana.kind,
              status: ana.status,
              content: ana.content,
              description: ana.description,
              datasets: Array(ana.datasets).map do |dataset|
                {
                  id: dataset.id,
                  type: dataset.type,
                  name: dataset.name,
                  instrument: dataset.instrument,
                  description: dataset.description,
                  attachments: Array(dataset.attachments).map do |attachment|
                    if(attachment.file)
                      {
                        id: attachment.id,
                        name: attachment.name,
                        filename: attachment.file.id
                      }
                    else
                      {
                        id: attachment.id,
                        name: attachment.name,
                        filename: attachment.filename
                      }
                    end
                  end
                }
              end
            }
          end
        end
      end

      desc "Update sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
        optional :name, type: String, desc: "Sample name"
        optional :external_label, type: String, desc: "Sample external label"
        optional :imported_readout, type: String, desc: "Sample Imported Readout"
        optional :target_amount_value, type: Float, desc: "Sample target amount_value"
        optional :target_amount_unit, type: String, desc: "Sample target amount_unit"
        optional :real_amount_value, type: Float, desc: "Sample real amount_value"
        optional :real_amount_unit, type: String, desc: "Sample real amount_unit"
        optional :description, type: String, desc: "Sample description"
        optional :purity, type: Float, desc: "Sample purity"
        optional :solvent, type: String, desc: "Sample solvent"
        optional :impurities, type: String, desc: "Sample impurities"
        optional :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :sample_svg_file, type: String, desc: "Sample SVG file"
        optional :molecule, type: Hash, desc: "Sample molecule"
        optional :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
        optional :analyses, type: Array
        optional :residues, type: Array
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Sample.find(params[:id])).update?
        end

        put do
          attributes = declared(params, include_missing: false)
          embedded_analyses = SampleUpdator.updated_embedded_analyses(params[:analyses])
          attributes.merge!(analyses: embedded_analyses)

          molecule_attributes = attributes.delete(:molecule)
          attributes.merge!(
            molecule_attributes: molecule_attributes
          ) unless molecule_attributes.blank?

          residues_attributes = attributes.delete(:residues)

          attributes.merge!(
            residues_attributes: residues_attributes
          ) unless residues_attributes.blank?

          if sample = Sample.find(params[:id])
            sample.update(attributes)
          end
          {sample: ElementPermissionProxy.new(current_user, sample).serialized}
        end
      end

      desc "Create a sample"
      params do
        optional :name, type: String, desc: "Sample name"
        optional :external_label, type: String, desc: "Sample external label"
        optional :imported_readout, type: String, desc: "Sample Imported Readout"
        requires :target_amount_value, type: Float, desc: "Sample target amount_value"
        requires :target_amount_unit, type: String, desc: "Sample target amount_unit"
        optional :real_amount_value, type: Float, desc: "Sample real amount_value"
        optional :real_amount_unit, type: String, desc: "Sample real amount_unit"
        requires :description, type: String, desc: "Sample description"
        requires :purity, type: Float, desc: "Sample purity"
        requires :solvent, type: String, desc: "Sample solvent"
        requires :impurities, type: String, desc: "Sample impurities"
        requires :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :sample_svg_file, type: String, desc: "Sample SVG file"
        optional :molecule, type: Hash, desc: "Sample molecule"
        optional :collection_id, type: Integer, desc: "Collection id"
        requires :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
        optional :analyses, type: Array
      end
      post do
        attributes = {
          name: params[:name],
          target_amount_value: params[:target_amount_value],
          target_amount_unit: params[:target_amount_unit],
          real_amount_value: params[:real_amount_value],
          real_amount_unit: params[:real_amount_unit],
          description: params[:description],
          purity: params[:purity],
          solvent: params[:solvent],
          impurities: params[:impurities],
          location: params[:location],
          molfile: params[:molfile],
          sample_svg_file: params[:sample_svg_file],
          is_top_secret: params[:is_top_secret],
          analyses: SampleUpdator.updated_embedded_analyses(params[:analyses]),
          created_by: current_user.id
        }
        attributes.merge!(
          molecule_attributes: params[:molecule]
        ) unless params[:molecule].blank?

        sample = Sample.create(attributes)
        sample.create_residues

        if collection_id = params[:collection_id]
          collection = Collection.find(collection_id)
          CollectionsSample.create(sample: sample, collection: collection)
          CollectionsSample.create(sample: sample, collection: Collection.get_all_collection_for_user(current_user.id))
        end
        sample
      end

      desc "Delete a sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Sample.find(params[:id])).destroy?
        end

        delete do
          Sample.find(params[:id]).destroy
        end
      end
    end
  end
end
