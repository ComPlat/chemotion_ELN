module Chemotion
  class CollectionAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Collection not found', 404)
    end

    resource :collections do
      get '/' do
        own_collections = Collection.connection.exec_query(Collection.serialized_own_collections_for(current_user).to_sql).map do |collection|
          Entities::OwnCollectionEntity.represent(collection, current_user: current_user).serializable_hash
        end

        shared_collections = Collection.connection.exec_query(Collection.serialized_shared_collections_for(current_user).to_sql).map do |collection|
          Entities::SharedCollectionEntity.represent(collection, current_user: current_user).serializable_hash
        end

        { own: own_collections, shared_with_me: shared_collections }
      end

      params do
        requires :id, type: String, regexp: /[Aa]ll|\d+/
      end
      get '/:id' do
        if params[:id].in?(%w[All all])
          collection = Collection.get_all_collection_for_user(current_user.id)
          present collection, with: Entities::OwnCollectionEntity, root: :collection
          return
        end

        id = params[:id].to_i
        if collection = Collection.own_collections_for(current_user).find_by(id: id)
          present collection, with: Entities::OwnCollectionEntity, root: :collection
        elsif collection = Collection.serialized_shared_collections_for(current_user).find_by(id: id) # find_by breaks, no idea why
          present collection, with: Entities::SharedCollectionEntity, root: :collection
        else
          raise ActiveRecord::RecordNotFound
        end
      end

      desc 'Adds a new child collection to a parent'
      params do
        requires :parent_id, type: Integer, allow_blank: true
        requires :label, type: String
        optional :inventory_id, type: Integer # TODO: check how a collection and an inventory are connected
      end
      post '/' do
        collection = Usecases::Collections::Create.new(current_user).perform!(
          parent_id: params[:parent_id],
          label: params[:label],
          inventory_id: params[:inventory_id]
        )

        present collection, with: Entities::OwnCollectionEntity, root: :collection
      end

      desc 'Updates the tree of own collections, updating the labels and ancestry/position'
      params do
        requires :collections, type: Array do
          requires :id, type: Integer
          optional :label, type: String
          optional :children, type: Array, default: [] # children have the same structure, but Grape cannot declare recursive structures
        end
      end
      put '/bulk_update_own_collections' do
        Usecases::Collections::UpdateTree.new(current_user).perform!(collections: params[:collections])

        own_collections = Collection.connection.exec_query(Collection.serialized_own_collections_for(current_user).to_sql)

        present own_collections, with: Entities::OwnCollectionEntity, root: :collections
      end

      desc 'Update a single own collection'
      params do
        requires :id, type: Integer
        optional :label, type: String
        optional :tabs_segment, type: Hash
      end
      put '/:id' do
        collection = Collection.own_collections_for(current_user).find(params[:id])
        attributes = { label: params[:label], tabs_segment: params[:tabs_segment] }.compact

        collection.update(attributes)

        present collection, with: Entities::OwnCollectionEntity, root: :collection
      end

      desc 'Deletes an own collection (shared collections can not be deleted, only the share rejected)'
      params do
        requires :id, type: Integer
      end
      delete '/:id' do
        collection = Collection.own_collections_for(current_user).find(params[:id])

        collection.destroy

        own_collections = Collection.connection.exec_query(Collection.serialized_own_collections_for(current_user).to_sql)

        present own_collections, with: Entities::OwnCollectionEntity, root: :collections
      end

      desc 'Export selected collections to zip archive'
      params do
        requires :collection_ids, type: Array[Integer]
      end
      post '/export' do
        collection_ids = params[:collection_ids].uniq
        all_collection_ids = Collection.own_collections_for(current_user).pluck(:id)

        error!('Select the collections you want to export.', 403) if collection_ids.empty?
        error!('401 Unauthorized', 401) if all_collection_ids & collection_ids != collection_ids

        ExportCollectionsJob.perform_now(collection_ids, 'zip', false, current_user.id)

        { status: 204 }
      end
    end
  end
end
