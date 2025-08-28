module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      get '/' do
        collections = Collection.accessible_for(current_user)

        present collections, with: Entities::CollectionEntity, root: :collections
      end
    end
  end
end
