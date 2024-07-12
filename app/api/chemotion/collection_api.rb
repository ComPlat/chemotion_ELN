module Chemotion
  # rubocop: disable Metrics/ClassLength, Style/MultilineIfModifier, Layout/MultilineMethodCallBraceLayout

  class CollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers
    resource :collections do

      desc "Return the all collections for the current user"
      get do
        collections = Collection.owned_by(current_user.id).includes(collection_acls: :user)
        shared = Collection.shared_with(current_user.id).includes(:user)

        {
          collections: Entities::CollectionOwnedEntity.represent(collections),
          shared: Entities::CollectionSharedEntity.represent(shared, shared_with: user_ids),
        }
      end

      desc "Return collection by id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          present fetch_collection_w_current_user(params[:id]), with: Entities::CollectionEntity, root: :collection
        rescue ActiveRecord::RecordNotFound
          Collection.none
        end

        desc "Return collection metadata"
        rescue_from ActiveRecord::RecordNotFound do
          error!('401 Unauthorized', 401)
        end
        before do
          error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).read_metadata?
        end
        get :metadata do
          metadata = Metadata.where(collection_id: params[:id]).first
          if metadata
            metadata
          else
            error!('404 Not Found', 404)
          end
        end

        desc "Create/update collection metadata"
        rescue_from ActiveRecord::RecordNotFound do
          error!('401 Unauthorized', 401)
        end
        params do
          requires :metadata, type: JSON
        end
        before do
          error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).update_metadata?
        end
        post :metadata do
          metadata = Metadata.where(collection_id: params[:id]).first
          unless metadata
            metadata = Metadata.new(collection_id: params[:id])
          end
          metadata.metadata = params[:metadata]
          metadata.save!
          metadata
        end
      end

      # TODO: check if this endpoint is really obsolete
      desc "Bulk update and/or create new collections"
      patch '/' do
        Collection.bulk_update(
          current_user.id, params[:collections].as_json(except: :descendant_ids), params[:deleted_ids]
        )
      end

      namespace :elements do
        desc 'Move elements by UI state to another collection'
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI" do
            use :main_ui_state_params
          end
          optional :collection_id, type: Integer, desc: 'Destination collect id'
          optional :newCollection, type: String, desc: 'Label for a new collion'
        end

        put do
          to_collection_id = fetch_collection_id_for_assign(params, 4)
          error!('401 Unauthorized assignment to collection', 401) unless to_collection_id

          from_collection = fetch_source_collection_for_removal
          error!('401 Unauthorized removal from collection', 401) unless from_collection
          if (from_collection.label == 'All' && from_collection.is_locked)
            error!('401 Cannot remove elements from  \'All\' root collection', 401)
          end
          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.move_to_collection(ids, from_collection.id, to_collection_id)
            collections_element_class.remove_in_collection(
              ids,
              Collection.get_all_collection_for_user(current_user.id)[:id]) if params[:is_sync_to_me]
          end

          Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
            ui_state = params[:ui_state][klass.name]
            next if ui_state.blank?

            ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            Labimotion::CollectionsElement.move_to_collection(ids, from_collection.id, to_collection_id, klass.name)
            Labimotion::CollectionsElement.remove_in_collection(ids, Collection.get_all_collection_for_user(current_user.id)[:id]) if params[:is_sync_to_me]
          end

          status 204
        end

        desc 'Assign a collection to a set of elements by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
            use :main_ui_state_params
          end
          optional :collection_id, type: Integer, desc: 'Destination collection id'
          optional :newCollection, type: String, desc: 'Label for a new collection'
        end

        post do
          from_collection = fetch_source_collection_for_assign
          error!('401 Unauthorized import from current collection', 401) unless from_collection
          to_collection_id = fetch_collection_id_for_assign(params, 4)

          error!('401 Unauthorized assignment to collection', 401) unless to_collection_id

          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.create_in_collection(ids, to_collection_id)
          end

          Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
            ui_state = params[:ui_state][klass.name]
            next if ui_state.blank?

            ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            Labimotion::CollectionsElement.create_in_collection(ids, to_collection_id)
          end

          status 204
        end

        desc "Remove from current collection a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI" do
            use :main_ui_state_params
          end
        end

        delete do
          # ui_state = params[:ui_state]
          from_collection = fetch_source_collection_for_removal
          error!('401 Unauthorized removal from collection', 401) unless from_collection
          if (from_collection.label == 'All' && from_collection.is_locked)
            error!('401 Cannot remove elements from  \'All\' root collection', 401)
          end

          message = ''
          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.remove_in_collection(ids, from_collection.id)
          end

          if message.is_a?(Array)
            Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
              ui_state = params[:ui_state][klass.name]
              next if ui_state.blank?

              ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
              next if ids.empty?

              Labimotion::CollectionsElement.remove_in_collection(ids, from_collection.id)
            end

            status 204
          else
            message
          end
        end
      end

      namespace :exports do
        desc "Create export job"
        params do
          requires :collections, type: Array[Integer]
          requires :format, type: Symbol, values: %i[json zip udm]
          requires :nested, type: Boolean
        end

        post do
          collection_ids = params[:collections].uniq
          nested = params[:nested] == true

          if collection_ids.empty?
            # no collection was given, export all collections for this user
            collection_ids = Collection.owned_by(user_ids).pluck(:id)
          else
            # check if the user is allowed to export these collections
            collection_ids.each do |collection_id|
              collection = Collection.owned_by(user_ids).find_by(id: collection_id)
              collection = Collection.shared_with_permission(user_ids).where(id: collection_id) if collection.nil?
              unless collection
                # case when collection purpose is to build the collection tree (empty and locked)
                next if Collection.find_by(id: collection_id, is_locked: true, is_shared: true)
              end
              error!('401 Unauthorized', 401) unless collection
            end
          end
          ExportCollectionsJob.perform_now(collection_ids, params[:format].to_s, nested, current_user.id)
          status 204
        end
      end

      namespace :imports do
        desc "Create import job"
        params do
          requires :file, type: File
        end
        post do
          file = params[:file]
          if tempfile = file[:tempfile]
            att = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              key: File.basename(file[:tempfile].path),
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type]
            )
            begin
              att.save!
            ensure
              tempfile.close
              tempfile.unlink
            end
            # run the asyncronous import job and return its id to the client
            ImportCollectionsJob.perform_now(att, current_user.id)
            status 204
          end
        end
      end

      namespace :tabs do
        after_validation do
          @collection = Collection.find(params[:id])
          error!('404 Collection with given id not found', 404) if @collection.nil?
          error!('401 Unauthorized', 401) unless @collection.user_id == current_user.id
        end
        desc 'insert tab segments'
        params do
          requires :id, type: Integer, desc: 'collection id'
          requires :segments, type: Hash, desc: 'orientation of the tabs'
        end
        post do
          collection = Collection.find(params[:id])
          collection.update(tabs_segment: params[:segments])
          collection
        end

        desc 'Update tab segment'
        params do
          requires :id, type: Integer, desc: 'Collection id'
          optional :segment, type: Hash, desc: 'Tab segment type'
        end

        patch do
          @collection.update(tabs_segment: params[:segment])
          status 204
        end
      end
    end
  end
end
# rubocop: enable Metrics/ClassLength, Style/MultilineIfModifier, Layout/MultilineMethodCallBraceLayout
