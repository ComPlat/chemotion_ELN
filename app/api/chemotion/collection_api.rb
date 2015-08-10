module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      desc "Return all unshared serialized collection roots"
      get :roots do
        current_user.collections.unshared.roots
      end

      desc "Return all shared serialized collection roots"
      get :shared_roots do
        current_user.collections.shared.roots
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
