module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      get '/' do
        collections = Collection.accessible_for(current_user)

        present collections, with: Entities::CollectionEntity, root: :collections
      end

      get '/:id' do
        collection = Collections.accessible_for(current_user).find(params[:id])

        present collection, with: Entities::CollectionEntity, root: :collection
      end


    end
  end
end
