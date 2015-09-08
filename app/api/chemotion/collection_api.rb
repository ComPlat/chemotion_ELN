module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      desc "Return all unshared serialized collection roots of current user"
      get :roots do
        current_user.collections.unshared.roots
      end

      desc "Return all shared serialized collection roots"
      get :shared_roots do
        Collection.shared(current_user.id).roots
      end

      desc "Return all remote serialized collection roots"
      get :remote_roots do
        current_user.collections.remote(current_user.id).roots
      end

      namespace :shared do
        desc "Create shared collections"
        params do
          requires :elements_filter, type: Hash
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
          end
          requires :user_ids, type: Array
        end
        post do
          # TODO better way to do this?
          params[:collection_attributes][:shared_by_id] = current_user.id
          Usecases::Sharing::ShareWithUsers.new(params).execute!
        end
      end

      # TODO add authorization/authentication, e.g. is current_user allowed
      # to fetch this samples?
      desc "Return serialized samples for given collection id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end

      route_param :id do
        get :samples do
          Collection.find(params[:id]).samples
        end
      end

    end
  end
end
