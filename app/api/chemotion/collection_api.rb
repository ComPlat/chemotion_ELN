module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      desc "Return all serialized collection roots"
      get :roots do
        Collection.roots
      end

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
