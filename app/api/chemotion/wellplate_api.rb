module Chemotion
  class WellplateAPI < Grape::API
    include Grape::Kaminari

    resource :wellplates do
      namespace :bulk do
        desc "Bulk create wellplates"
        params do
          requires :wellplates, type: Array do
            requires :name, type: String
            optional :size, type: Integer
            optional :description, type: String
            optional :wells, type: Array
            optional :collection_id, type: Integer
          end
        end
        post do
          Usecases::Wellplates::BulkCreate.new(params, current_user.id).execute!
          body false
        end
      end

      namespace :ui_state do
        desc "Delete wellplates by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected wellplates from the UI" do
            requires :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end

        desc "Get Wellplates by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected wellplates from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :collection_id
          end
        end
        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])).read?
        end
        # we are using POST because the fetchers don't support GET requests with body data
        post do
          wellplates = Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])

          {wellplates: wellplates.map{|w| WellplateSerializer.new(w).serializable_hash.deep_symbolize_keys}}
        end
      end

      desc "Return serialized wellplates"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).wellplates
        else
          # All collection of current_user
          Wellplate.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s).serialized}
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
          wellplate = Wellplate.find(params[:id])
          {wellplate: ElementPermissionProxy.new(current_user, wellplate).serialized}
        end
      end

      desc "Delete a wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).destroy?
        end

        delete do
          Wellplate.find(params[:id]).destroy
        end
      end

      desc "Update wellplate by id"
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :size, type: Integer
        optional :description, type: String
        optional :wells, type: Array
        optional :collection_id, type: Integer
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).update?
        end

        put do
          Usecases::Wellplates::Update.new(params).execute!
        end
      end

      desc "Create a wellplate"
      params do
        requires :name, type: String
        optional :size, type: Integer
        optional :description, type: String
        optional :wells, type: Array
        optional :collection_id, type: Integer
      end
      post do
        Usecases::Wellplates::Create.new(params, current_user.id).execute!
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
