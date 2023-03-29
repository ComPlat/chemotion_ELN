module Chemotion
  class TempCollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    resource :temp_collections do
      desc "Return all collections of the current user"
      get do
        collections = current_user.collections.with_collections_acls.includes(collection_acls: :user)

        present collections.distinct, with: Entities::CollectionEntity, root: :collections
      end

      desc 'Return collection by id'
      params do
        requires :id, type: Integer, desc: 'Collection id'
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          begin
            present Collection.find(params[:id]), with: Entities::CollectionEntity, root: 'collection'
          rescue ActiveRecord::RecordNotFound
            Collection.none
          end
        end
      end

      desc "Bulk update and/or create new collections"
      patch '/' do
        Collection.bulk_update(
          current_user.id, params[:collections].as_json(except: :descendant_ids), params[:deleted_ids]
        )
      end
    end
  end
end


