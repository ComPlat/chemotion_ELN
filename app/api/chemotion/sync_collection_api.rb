module Chemotion
  class SyncCollectionAPI < Grape::API
    resource :syncCollections do
      rescue_from ActiveRecord::RecordNotFound do |error|
        message = "Could not find sync Collection"
        error!(message, 404)
      end

      desc "Return sync collection by id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          current_user.all_sync_in_collections_users.find(params[:id])
        end
      end

#TODO
      namespace :take_ownership do
        desc "Take ownership of collection with specified sync_collections_user id"
         params do
           requires :id, type: Integer, desc: "SyncCollectionsUSer id"
         end
         route_param :id do
           before do
      #       error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).take_ownership?
           end

           post do
      #       Usecases::Sharing::TakeOwnership.new(params.merge(current_user_id: current_user.id)).execute!
           end
         end
       end


      desc "Return all remote serialized collections"
      get :sync_remote_roots, each_serializer: SyncCollectionRemoteSerializer do
        current_user.all_collections.remote(current_user.id).roots
      end


        desc "Update Sync collection"
        params do
          requires :id, type: Integer
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
          end
        end

        put ':id' do
          sync = SyncCollectionsUser.where(id: params[:id],shared_by_id: current_user.id).first
          sync && sync.update!(params[:collection_attributes])
        end

        desc "Create Sync collections"
        params do
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
          end
          requires :user_ids, type: Array
          requires :id, type: Integer
        end

        before do
          c = Collection.where(is_shared:false,id: params[:id],user_id: current_user.id).first
          if c
            samples =   c.samples
            reactions = c.reactions
            wellplates = c.wellplates
            screens = c.screens

            top_secret_sample = samples.pluck(:is_top_secret).any?
            top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
            top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
            top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

            is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen

            error!('401 Unauthorized', 401) if (is_top_secret)
          end
        end

        post do
          Usecases::Sharing::SyncWithUsers.new(params, current_user).execute!
        end

        desc "delete sync by id"
        params do
          requires :id, type: Integer
        end

        delete ':id' do
          sync = SyncCollectionsUser.where(id: params[:id],shared_by_id: current_user.id).first
          sync && sync.destroy
        end

    end
  end
end
