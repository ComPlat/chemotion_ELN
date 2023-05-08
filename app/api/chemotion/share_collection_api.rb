module Chemotion
  class ShareCollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    resource :share_collections do
      desc "Return the list of all collections shared with current user"
      get do
        collections = Collection.joins(:collection_acls).includes(:user).where('collection_acls.user_id = ?', current_user.id)
        present collections, with: Entities::CollectionEntity, root: :collections
      end

      desc 'Return shared collection by id'
      params do
        requires :id, type: Integer, desc: 'Collection id'
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          begin
            collection = current_user.acl_collection_by_id(params[:id])

            present collection, with: Entities::CollectionEntity, root: 'collection'
          rescue ActiveRecord::RecordNotFound
            Collection.none
          end
        end
      end

      desc 'Assign, move or share a collection'
      params do
        requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
          use :main_ui_state_params
        end
        optional :collection_id, type: Integer, desc: 'Destination collection id'
        optional :newCollection, type: String, desc: 'Label for a new collection'
        optional :user_ids, type: Array
        optional :label, type: String
        optional :newCollection, type: String
        optional :action, type: String
      end

      post do

        from_collection = case params[:action]
                          when 'move' then fetch_source_collection_for_removal
                          else fetch_source_collection_for_assign
                          end
        error!('401 Unauthorized import from current collection', 401) unless from_collection
        to_collection_id = fetch_collection_id_for_assign(params, 4)


        error!('401 Unauthorized assignment to collection', 401) unless to_collection_id
        if !params[:user_ids].blank?
          params[:user_ids].each do |user|
            create_elements(params, from_collection, to_collection_id)
            create_generic_elements(params, from_collection, to_collection_id)
            to_collection_id = to_collection_id ? to_collection_id : from_collection&.id
            create_acl_collection(user[:value], to_collection_id, params)
          end
        else
          create_elements(params, from_collection, to_collection_id)
          create_generic_elements(params, from_collection, to_collection_id)
        end

        status 204
      end
    end
  end
end
