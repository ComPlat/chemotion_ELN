module Chemotion
  class ScreenAPI < Grape::API
    include Grape::Kaminari

    resource :screens do

      desc "Return serialized screens"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).screens
        else
          # All collection of current_user
          Screen.joins(:collections).where('collections.user_id = ?', current_user.id)
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized screen by id"
      params do
        requires :id, type: Integer, desc: "Screen id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Screen.find(params[:id])).read?
        end

        get do
          Screen.find(params[:id])
        end
      end

    end
  end
end
