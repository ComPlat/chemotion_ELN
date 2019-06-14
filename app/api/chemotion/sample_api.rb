require 'open-uri'
#require './helpers'

module Chemotion
  class SampleAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers ProfileHelpers

    resource :samples do

      # TODO Refactoring: Use Grape Entities
      namespace :ui_state do
        desc "Get samples by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected samples from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :collection_id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :limit, type: Integer, desc: "Limit number of samples"
        end

        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @samples = Sample.by_collection_id(cid).by_ui_state(params[:ui_state]).for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @samples).read?
        end

        # we are using POST because the fetchers don't support GET requests with body data
        post do
          @samples = @samples.limit(params[:limit]) if params[:limit]
          { samples: @samples.map{ |s| SampleSerializer.new(s).serializable_hash.deep_symbolize_keys}  }
        end
      end

      namespace :subsamples do
        desc "Split Samples into Subsamples"
        params do
          requires :ui_state, type: Hash, desc: "Selected samples from the UI"
        end
        post do
          ui_state = params[:ui_state]
          col_id = ui_state[:currentCollectionId]
          sample_ids = Sample.for_user(current_user.id).for_ui_state_with_collection(ui_state[:sample], CollectionsSample, col_id)
          Sample.where(id: sample_ids).each do |sample|
            subsample = sample.create_subsample current_user, col_id, true
          end
        end
      end

      namespace :import do
        desc "Import Samples from a File"

        before do
          error!('401 Unauthorized', 401) unless current_user.collections.find(params[:currentCollectionId])
        end
        post do
          extname = File.extname(params[:file][:filename])
          if extname.match(/\.(sdf?|mol)/i)
            sdf_import = Import::ImportSdf.new(file_path: params[:file][:tempfile].path,
              collection_id: params[:currentCollectionId],
              mapped_keys: {
                description: {field: "description", displayName: "Description", multiple: true},
                location: {field: "location", displayName: "Location"},
                name: {field: "name", displayName: "Name"},
                external_label: {field: "external_label", displayName: "External label"},
                purity: {field: "purity", displayName: "Purity"},
              },
              current_user_id: current_user.id)
            sdf_import.find_or_create_mol_by_batch
            return {
               sdf: true, message: sdf_import.message,
               data: sdf_import.processed_mol, status: sdf_import.status,
               custom_data_keys: sdf_import.custom_data_keys.keys,
               mapped_keys: sdf_import.mapped_keys,
               collection_id: sdf_import.collection_id
             }
          end
          # Creates the Samples from the XLS/CSV file. Empty Array if not successful
          import = Import::ImportSamples.new.from_file(params[:file][:tempfile].path,
            params[:currentCollectionId], current_user.id).process
        end
      end

      namespace :confirm_import do
        desc "Create Samples from an Array of inchikeys"
        params do
          requires :rows, type: Array, desc: "Selected Molecule from the UI"
          requires :currentCollectionId, type: Integer
          requires :mapped_keys, type: Hash
        end

        before do
          error!('401 Unauthorized', 401) unless current_user.collections.find(params[:currentCollectionId])
        end

        post do
          sdf_import = Import::ImportSdf.new(
            collection_id: params[:currentCollectionId],
            current_user_id: current_user.id,
            rows: params[:rows],
            mapped_keys: params[:mapped_keys]

          )
          sdf_import.create_samples
          return {
            sdf: true, message: sdf_import.message, status: sdf_import.status,
          }
        end
      end

      desc 'Return serialized molecules_samples_groups of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id,
                 type: Integer,
                 desc: 'SyncCollectionsUser id'
        optional :molecule_sort, type: Integer, desc: 'Sort by parameter'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :product_only, type: Boolean, desc: 'query only reaction products'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100

      get do
        own_collection = false
        scope = Sample.none
        if params[:collection_id]
          begin
            c = Collection.belongs_to_or_shared_by(
              current_user.id, current_user.group_ids
            ).find(params[:collection_id])

            !c.is_shared && (c.shared_by_id != current_user.id) &&
              (own_collection = true)

            scope = Collection.belongs_to_or_shared_by(
              current_user.id, current_user.group_ids
            ).find(params[:collection_id]).samples
          rescue ActiveRecord::RecordNotFound
            Sample.none
          end
        elsif params[:sync_collection_id]
          begin
            own_collection = false
            c = current_user.all_sync_in_collections_users
                            .find(params[:sync_collection_id])

            scope = c.collection.samples
          rescue ActiveRecord::RecordNotFound
            Sample.none
          end
        else
          # All collection
          own_collection = true
          scope = Sample.for_user(current_user.id).uniq
        end
        scope = scope.includes(
          :residues, :tag, :molecule_name,
          collections: :sync_collections_users,
          molecule: :tag
        )
        prod_only = params[:product_only] || false
        scope = if prod_only
                  scope.product_only
                else
                  scope.uniq.sample_or_startmat_or_products
                end
        from = params[:from_date]
        to = params[:to_date]
        scope = scope.samples_created_time_from(Time.at(from)) if from
        scope = scope.samples_created_time_to(Time.at(to) + 1.day) if to

        reset_pagination_page(scope)
        sample_serializer_selector =
          if own_collection
            ->(s) { SampleListSerializer::Level10.new(s, 10).serializable_hash }
          else
            lambda do |s|
              ElementListPermissionProxy.new(current_user, s, user_ids).serialized
            end
          end

        samplelist = []
        if params[:molecule_sort] == 1
          molecule_scope = Molecule
                           .where(id: (scope.pluck :molecule_id))
                           .order("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))")
                           .order(:sum_formular)
          reset_pagination_page(molecule_scope)
          paginate(molecule_scope).each do |molecule|
            next if molecule.nil?
            samplesGroup = scope.select {|v| v.molecule_id == molecule.id}
            samplesGroup = samplesGroup.sort { |x, y| y.updated_at <=> x.updated_at }
            samplesGroup.each do |sample|
            serialized_sample = sample_serializer_selector.call(sample)
            samplelist.push(serialized_sample)
            end
          end
        else
          scope = scope.order('updated_at DESC')
          paginate(scope).each do |sample|
            next if sample.nil?
            serialized_sample = sample_serializer_selector.call(sample)
            samplelist.push(serialized_sample)
          end
        end
        return {
          samples: samplelist,
          samples_count: scope.count
        }
      end

      desc "Return serialized sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        before do
          @element_policy = ElementPolicy.new(current_user, Sample.find(params[:id]))
          error!('401 Unauthorized', 401) unless @element_policy.read?
        end

        get do
          sample= Sample.includes(:molecule, :residues, :elemental_compositions, :container)
                        .find(params[:id])

          var_detail_level = db_exec_detail_level_for_sample(current_user.id, sample.id);
          nested_detail_levels = {}
          nested_detail_levels[:sample] = var_detail_level[0]['detail_level_sample'].to_i
          nested_detail_levels[:wellplate] = [ var_detail_level[0]['detail_level_wellplate'].to_i ]

          klass = "Entities::SampleEntity::Level#{nested_detail_levels[:sample]}".constantize
          opt = { nested_dl: nested_detail_levels, policy: @element_policy, current_user: current_user, serializable: true }
          serialized_sample = klass.represent(sample, opt)

          {sample: serialized_sample}
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
        optional :molarity_value, type: Float, desc: "Sample molarity value"
        optional :molarity_unit, type: String, desc: "Sample real amount_unit"
        optional :description, type: String, desc: "Sample description"
        optional :purity, type: Float, desc: "Sample purity"
        optional :solvent, type: String, desc: "Sample solvent"
        optional :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :sample_svg_file, type: String, desc: "Sample SVG file"
        # optional :molecule, type: Hash, desc: "Sample molecule" do
          # optional :id, type: Integer
        # end
        optional :molecule_id, type: Integer
        optional :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
        optional :density, type: Float, desc: "Sample density"
        optional :boiling_point, type: Float, desc: "Sample boiling point"
        optional :melting_point, type: Float, desc: "Sample melting point"
        optional :residues, type: Array
        optional :elemental_compositions, type: Array
        optional :xref, type: Hash
        optional :stereo, type: Hash do
          optional :abs, type: String, values: Sample::STEREO_ABS, default: Sample::STEREO_DEF['abs']
          optional :rel, type: String, values: Sample::STEREO_REL, default: Sample::STEREO_DEF['rel']
        end
        optional :molecule_name_id, type: Integer
        requires :container, type: Hash
        #use :root_container_params
      end

      route_param :id do
        before do
          @sample = Sample.find(params[:id])
          @element_policy = ElementPolicy.new(current_user, @sample)
          error!('401 Unauthorized', 401) unless @element_policy.update?
        end
        put do
          attributes = declared(params, include_missing: false)

          update_datamodel(attributes[:container]);
          attributes.delete(:container);


          # otherwise ActiveRecord::UnknownAttributeError appears
          attributes[:elemental_compositions].each do |i|
            i.delete :description
          end if attributes[:elemental_compositions]

          # set nested attributes
          %i(molecule residues elemental_compositions).each do |prop|
            prop_value = attributes.delete(prop)
            attributes.merge!(
              "#{prop}_attributes".to_sym => prop_value
            ) unless prop_value.blank?
          end

          @sample.update!(attributes)

          #save to profile
          kinds = @sample.container&.analyses&.pluck("extended_metadata->'kind'")
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          var_detail_level = db_exec_detail_level_for_sample(current_user.id, @sample.id)
          nested_detail_levels = {}
          nested_detail_levels[:sample] = var_detail_level[0]['detail_level_sample'].to_i
          nested_detail_levels[:wellplate] = [var_detail_level[0]['detail_level_wellplate'].to_i]

          klass = "Entities::SampleEntity::Level#{nested_detail_levels[:sample]}".constantize
          opt = {
            nested_dl: nested_detail_levels,
            policy: @element_policy,
            current_user: current_user, serializable: true
          }
          serialized_sample = klass.represent(@sample, opt)

          { sample: serialized_sample }
        end
      end

      desc "Create a sample"
      params do
        optional :name, type: String, desc: "Sample name"
        optional :short_label, type: String, desc: "Sample short label"
        optional :external_label, type: String, desc: "Sample external label"
        optional :imported_readout, type: String, desc: "Sample Imported Readout"
        requires :target_amount_value, type: Float, desc: "Sample target amount_value"
        requires :target_amount_unit, type: String, desc: "Sample target amount_unit"
        optional :real_amount_value, type: Float, desc: "Sample real amount_value"
        optional :real_amount_unit, type: String, desc: "Sample real amount_unit"
        optional :molarity_value, type: Float, desc: "Sample molarity value"
        optional :molarity_unit, type: String, desc: "Sample real amount_unit"
        requires :description, type: String, desc: "Sample description"
        requires :purity, type: Float, desc: "Sample purity"
        requires :solvent, type: String, desc: "Sample solvent"
        requires :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :sample_svg_file, type: String, desc: "Sample SVG file"
        #optional :molecule, type: Hash, desc: "Sample molecule"
        optional :collection_id, type: Integer, desc: "Collection id"
        requires :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
        optional :density, type: Float, desc: "Sample density"
        optional :boiling_point, type: Float, desc: "Sample boiling point"
        optional :melting_point, type: Float, desc: "Sample melting point"
        optional :residues, type: Array
        optional :elemental_compositions, type: Array
        optional :xref, type: Hash
        optional :stereo, type: Hash do
          optional :abs, type: String, values: Sample::STEREO_ABS, default: Sample::STEREO_DEF['abs']
          optional :rel, type: String, values: Sample::STEREO_REL, default: Sample::STEREO_DEF['rel']
        end
        optional :molecule_name_id, type: Integer
        optional :molecule_id, type: Integer
        requires :container, type: Hash
      end
      post do

        attributes = {
          name: params[:name],
          short_label: params[:short_label],
          external_label: params[:external_label],
          target_amount_value: params[:target_amount_value],
          target_amount_unit: params[:target_amount_unit],
          real_amount_value: params[:real_amount_value],
          real_amount_unit: params[:real_amount_unit],
          molarity_value: params[:molarity_value],
          molarity_unit: params[:molarity_unit],
          description: params[:description],
          purity: params[:purity],
          solvent: params[:solvent],
          location: params[:location],
          molfile: params[:molfile],
          molecule_id: params[:molecule_id],
          sample_svg_file: params[:sample_svg_file],
          is_top_secret: params[:is_top_secret],
          density: params[:density],
          boiling_point: params[:boiling_point],
          melting_point: params[:melting_point],
          residues: params[:residues],
          elemental_compositions: params[:elemental_compositions],
          created_by: current_user.id,
          xref: params[:xref],
          stereo: params[:stereo],
          molecule_name_id: params[:molecule_name_id]
        }

        # otherwise ActiveRecord::UnknownAttributeError appears
        # TODO should be in params validation
        attributes[:elemental_compositions].each do |i|
          i.delete :description
          i.delete :id
        end if attributes[:elemental_compositions]

        attributes[:residues].each do |i|
          i.delete :id
        end if attributes[:residues]

        # set nested attributes
        %i(molecule residues elemental_compositions).each do |prop|
          prop_value = attributes.delete(prop)
          attributes.merge!(
            "#{prop}_attributes".to_sym => prop_value
          ) unless prop_value.blank?
        end

        sample = Sample.new(attributes)

        if params[:collection_id]
          collection = current_user.collections.find(params[:collection_id])
          sample.collections << collection
        end

        all_coll = Collection.get_all_collection_for_user(current_user.id)
        sample.collections << all_coll

        sample.container = update_datamodel(params[:container])

        sample.save!

        #save to profile
        kinds = sample.container&.analyses&.pluck("extended_metadata->'kind'")
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        sample
      end

      desc "Delete a sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Sample.find(params[:id])).destroy?
        end

        delete do
          sample = Sample.find(params[:id])
          # DevicesSample.find_by(sample_id: sample.id).destroy
          # sample.devices_analyses.map{|d|
          #   d.analyses_experiments.destroy_all
          #   d.destroy
          # }
          sample.destroy
        end
      end
    end
  end
end
