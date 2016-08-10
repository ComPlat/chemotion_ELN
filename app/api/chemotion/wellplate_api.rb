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
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
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
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])).read?
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
      before do
        params[:per_page].to_i > 50 && (params[:per_page] = 50)
      end
      get do
        scope = if params[:collection_id]
          begin
            Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids).
              find(params[:collection_id]).wellplates
          rescue ActiveRecord::RecordNotFound
              Wellplate.none
          end
        else
          # All collection of current_user
          Wellplate.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Return serialized wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).read?
        end

        get do
          wellplate = Wellplate.find(params[:id])
          {wellplate: ElementPermissionProxy.new(current_user, wellplate, user_ids).serialized}
        end
      end

      desc "Delete a wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).destroy?
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
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).update?
        end

        put do
          wellplate = Usecases::Wellplates::Update.new(declared(params, include_missing: false)).execute!
          {wellplate: ElementPermissionProxy.new(current_user, wellplate, user_ids).serialized}
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
        wellplate = Usecases::Wellplates::Create.new(declared(params, include_missing: false), current_user.id).execute!
        current_user.increment_counter 'wellplates'
        {wellplate: ElementPermissionProxy.new(current_user, wellplate, user_ids).serialized}
      end
    end
  end
end
