module Chemotion
  class WellplateAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers

    resource :wellplates do
      namespace :bulk do
        desc "Bulk create wellplates"
        params do
          requires :wellplates, type: Array do
            requires :name, type: String
            optional :size, type: Integer
            optional :description, type: Hash
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
        desc "Get Wellplates by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected wellplates from the UI" do
            use :ui_state_params
          end
        end
        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @wellplates = Wellplate.by_collection_id(cid).by_ui_state(params[:ui_state]).for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @wellplates).read?
        end
        # we are using POST because the fetchers don't support GET requests with body data
        post do
          { wellplates: @wellplates.map{ |w| WellplateSerializer.new(w).serializable_hash.deep_symbolize_keys } }
        end
      end

      desc "Return serialized wellplates"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :sync_collection_id, type: Integer, desc: "SyncCollectionsUser id"
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
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
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection.wellplates
          rescue ActiveRecord::RecordNotFound
            Wellplate.none
          end
        else
          # All collection of current_user
          Wellplate.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.includes(collections: :sync_collections_users).order("created_at DESC")

        from = params[:from_date]
        to = params[:to_date]
        scope = scope.created_time_from(Time.at(from)) if from
        scope = scope.created_time_to(Time.at(to) + 1.day) if to

        reset_pagination_page(scope)

        paginate(scope).map{|s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized}
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
        optional :description, type: Hash
        optional :wells, type: Array
        requires :container, type: Hash
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).update?
        end

        put do
          update_datamodel(params[:container]);
          params.delete(:container);

          wellplate = Usecases::Wellplates::Update.new(declared(params, include_missing: false)).execute!

          #save to profile
          kinds = wellplate.container&.analyses&.pluck("extended_metadata->'kind'")
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        {wellplate: ElementPermissionProxy.new(current_user, wellplate, user_ids).serialized}
        end
      end

      desc "Create a wellplate"
      params do
        requires :name, type: String
        optional :size, type: Integer
        optional :description, type: Hash
        optional :wells, type: Array
        optional :collection_id, type: Integer
        requires :container, type: Hash
      end
      post do

        container = params[:container]
        params.delete(:container)

        wellplate = Usecases::Wellplates::Create.new(declared(params, include_missing: false), current_user.id).execute!
        wellplate.container =  update_datamodel(container)

        wellplate.save!

        #save to profile
        kinds = wellplate.container&.analyses&.pluck("extended_metadata->'kind'")
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          current_user.increment_counter 'wellplates'
        {wellplate: ElementPermissionProxy.new(current_user, wellplate, user_ids).serialized}
      end

      namespace :subwellplates do
        desc "Split Wellplates into Subwellplates"
        params do
          requires :ui_state, type: Hash, desc: "Selected wellplates from the UI"
        end
        post do
          ui_state = params[:ui_state]
          col_id = ui_state[:currentCollectionId]
          wellplate_ids = Wellplate.for_user(current_user.id).for_ui_state_with_collection(ui_state[:wellplate], CollectionsWellplate, col_id)
          Wellplate.where(id: wellplate_ids).each do |wellplate|
            subwellplate = wellplate.create_subwellplate current_user, col_id, true
          end
        end
      end
    end
  end
end
