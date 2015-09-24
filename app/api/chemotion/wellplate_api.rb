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
          # All collection of current_user
          Wellplate.joins(:collections).where('collections.user_id = ?', current_user.id)
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).read?
        end

        get do
          Wellplate.find(params[:id])
        end
      end

      desc "Delete a wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      delete do
        wellplate_id = params[:id]
        Wellplate.find(wellplate_id).destroy
        Well.where(wellplate_id: wellplate_id).destroy_all

        # WARNING: Using delete_all instead of destroy_all due to PG Error
        # TODO: Check this error and consider another solution
        CollectionsWellplate.where(wellplate_id: wellplate_id).delete_all
      end

    end
  end
end
