module Chemotion
  class ScreenAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers

    resource :screens do
      desc "Return serialized screens"
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
              find(params[:collection_id]).screens
          rescue ActiveRecord::RecordNotFound
            Screen.none
          end
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection.screens
          rescue ActiveRecord::RecordNotFound
            Screen.none
          end
        else
          # All collection of current_user
          Screen.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.includes(collections: :sync_collections_users).order("created_at DESC")

        from = params[:from_date]
        to = params[:to_date]
        scope = scope.created_time_from(Time.at(from)) if from
        scope = scope.created_time_to(Time.at(to) + 1.day) if to

        reset_pagination_page(scope)

        paginate(scope).map{|s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Return serialized screen by id"
      params do
        requires :id, type: Integer, desc: "Screen id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Screen.find(params[:id])).read?
        end

        get do
          screen = Screen.find(params[:id])
          {screen: ElementPermissionProxy.new(current_user, screen, user_ids).serialized}
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
        optional :description, type: Hash
        requires :wellplate_ids, type: Array
        requires :container, type: Hash
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Screen.find(params[:id])).update?
        end

        put do
          update_datamodel(params[:container]);
          params.delete(:container);

          attributes = declared(params.except(:wellplate_ids), include_missing: false)

          screen = Screen.find(params[:id])
          screen.update(attributes)
          old_wellplate_ids = screen.wellplates.pluck(:id)

          #save to profile
          kinds = screen.container&.analyses&.pluck("extended_metadata->'kind'")
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          params[:wellplate_ids].each do |id|
            ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: params[:id])
          end

          (old_wellplate_ids - params[:wellplate_ids]).each do |id|
            ScreensWellplate.where(wellplate_id: id, screen_id: params[:id]).destroy_all
          end
          {screen: ElementPermissionProxy.new(current_user, screen, user_ids).serialized}
        end
      end

      desc "Create a screen"
      params do
        requires :name, type: String
        optional :collaborator, type: String
        optional :requirements, type: String
        optional :conditions, type: String
        optional :result, type: String
        optional :description, type: Hash
        optional :collection_id, type: Integer
        requires :wellplate_ids, type: Array
        requires :container, type: Hash
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

        screen.container = update_datamodel(params[:container])
        screen.save!

        #save to profile
        kinds = screen.container&.analyses&.pluck("extended_metadata->'kind'")
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        collection = Collection.find(params[:collection_id])
        CollectionsScreen.create(screen: screen, collection: collection)
        CollectionsScreen.create(screen: screen, collection: Collection.get_all_collection_for_user(current_user.id))

        params[:wellplate_ids].each do |id|
          ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: screen.id)
        end
        screen
      end
    end
  end
end
