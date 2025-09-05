module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      get '/' do
        collections = Collection.accessible_for(current_user)

        present collections, with: Entities::CollectionEntity, root: :collections
      end

      get '/:id' do
        collection = Collection.accessible_for(current_user).find(params[:id])

        present collection, with: Entities::CollectionEntity, root: :collection
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

        present collection, with: Entities::CollectionEntity, root: :collection
      end
    end
  end
end
