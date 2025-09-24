module Chemotion
  class CollectionAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Collection not found', 404)
    end

    resource :collections do
      get '/' do
        own_collections = Collection.connection.exec_query(Collection.own_collections_for(current_user).to_sql).map do |collection|
          Entities::OwnCollectionEntity.represent(collection, current_user: current_user).serializable_hash
        end

        shared_collections = Collection.connection.exec_query(Collection.shared_collections_for(current_user).to_sql).map do |collection|
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
        if collection = Collection.own_collections_for(current_user).where(id: id).first # find_by breaks, no idea why
          present collection, with: Entities::OwnCollectionEntity, root: :collection
        elsif collection = Collection.shared_collections_for(current_user).where(id: id).first # find_by breaks, no idea why
          present collection, with: Entities::SharedCollectionEntity, root: :collection
        else
          raise ActiveRecord::RecordNotFound
        end
      end

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

      params do
        requires :collections, type: Array do
          requires :id, type: Integer
          optional :label, type: String
          optional :children, type: Array, default: [] # children have the same structure, but Grape cannot declare recursive structures
        end
      end
      put '/bulk_update_own_collections' do
        Usecases::Collections::UpdateTree.new(current_user).perform!(collections: params[:collections])

        own_collections = Collection.connection.exec_query(Collection.own_collections_for(current_user).to_sql)

        present own_collections, with: Entities::OwnCollectionEntity, root: :collections
      end
    end
  end
end
