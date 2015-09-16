module Chemotion
  class WellplateAPI < Grape::API
    include Grape::Kaminari

    resource :wellplates do

      desc "Return serialized wellplates"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).wellplates
        else
          Wellplates.all
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        get do
          Wellplate.find(params[:id])
        end
      end

    end
  end
end
