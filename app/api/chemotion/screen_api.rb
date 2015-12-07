module Chemotion
  class ScreenAPI < Grape::API
    include Grape::Kaminari

    resource :screens do

      desc "Return serialized screens"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).screens
        else
          # All collection of current_user
          Screen.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        scope = Kaminari.paginate_array(scope.map{|s| ElementPermissionProxy.new(current_user, s).serialized})
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
          screen = Screen.find(params[:id])
          {screen: ElementPermissionProxy.new(current_user, screen).serialized}
        end
      end

      desc "Update screen by id"
      params do
        requires :id, type: Integer, desc: "screen id"
        optional :name, type: String
        optional :collaborator, type: String
        optional :requirements, type: String
        optional :conditions, type: String
        optional :result, type: String
        optional :description, type: String
        requires :wellplate_ids, type: Array
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Screen.find(params[:id])).update?
        end

        put do
          attributes = {
            name: params[:name],
            collaborator: params[:collaborator],
            requirements: params[:requirements],
            conditions: params[:conditions],
            result: params[:result],
            description: params[:description]
          }
          screen = Screen.find(params[:id])
          screen.update(attributes)
          old_wellplate_ids = screen.wellplates.pluck(:id)

          params[:wellplate_ids].each do |id|
            ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: params[:id])
          end

          (old_wellplate_ids - params[:wellplate_ids]).each do |id|
            ScreensWellplate.where(wellplate_id: id, screen_id: params[:id]).destroy_all
          end
          {screen: ElementPermissionProxy.new(current_user, screen).serialized}
        end
      end

      desc "Create a screen"
      params do
        requires :name, type: String
        optional :collaborator, type: String
        optional :requirements, type: String
        optional :conditions, type: String
        optional :result, type: String
        optional :description, type: String
        optional :collection_id, type: Integer
        requires :wellplate_ids, type: Array
      end
      post do
        attributes = {
            name: params[:name],
            collaborator: params[:collaborator],
            requirements: params[:requirements],
            conditions: params[:conditions],
            result: params[:result],
            description: params[:description]
        }
        screen = Screen.create(attributes)

        collection = Collection.find(params[:collection_id])
        CollectionsScreen.create(screen: screen, collection: collection)
        CollectionsScreen.create(screen: screen, collection: Collection.get_all_collection_for_user(current_user.id))

        params[:wellplate_ids].each do |id|
          ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: screen.id)
        end
        screen
      end

      namespace :ui_state do
        desc "Delete screens by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected screens from the UI" do
            requires :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Screen.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Screen.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

    end
  end
end
