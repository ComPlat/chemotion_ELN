module Chemotion
  class ShareCollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    resource :share_collections do
      desc 'Assign, move or share a collection'
      params do
        requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
          use :main_ui_state_params
        end
        optional :collection_id, type: Integer, desc: 'Destination collection id'
        optional :newCollection, type: String, desc: 'Label for a new collection'
        optional :user_ids, type: Array
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

      desc 'Update Share collection'
      params do
        requires :id, type: Integer
        optional :collection_attributes, type: Hash do
          optional :permission_level, type: Integer
          optional :sample_detail_level, type: Integer
          optional :reaction_detail_level, type: Integer
          optional :wellplate_detail_level, type: Integer
          optional :screen_detail_level, type: Integer
          optional :element_detail_level, type: Integer
          optional :label, type: String
        end
      end

      put ':id' do
        collection_acl = CollectionAcl.find(params[:id])
        # Check if the user is allowed to update the collection
        collection = fetch_collection_w_current_user(collection_acl.collection_id, 4)
        error!('401 Unauthorized update collection', 401) unless collection
        # Update the collection
        collection_acl.update!(params[:collection_attributes])
      rescue ActiveRecord::RecordNotFound
        error!('404 Share collection id not found', 404)
      end

      desc "Delete access to a share collection,"
      params do
        requires :id, type: Integer, desc: "collection_acl id"
      end
      route_param :id do
        delete do
          collection_acl = CollectionAcl.includes(:collection).find_by(id: params[:id])
          error!('404 Share collection id not found', 404) unless collection_acl
          unless user_ids.include?(user_ids) || user_ids.include?(collection_acl.collection.user_id)
            error!('401 Unauthorized delete share collection', 401)
          end
          collection_acl.destroy!
          status 204
        end
      end

      namespace :take_ownership do
        desc 'Take ownership of collection with specified collection id'
        params do
          requires :id, type: Integer, desc: 'Collection id'
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless CollectionAclPolicy.new(current_user, Collection.find(params[:id])).take_ownership?
          end

          post do
            Usecases::Sharing::TakeOwnership.new(params.merge(current_user_id: current_user.id)).execute!
            { success: true } # to prevent serializing the result of the usecase
          end
        end
      end
    end
  end
end
