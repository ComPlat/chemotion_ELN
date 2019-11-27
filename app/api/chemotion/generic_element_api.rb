module Chemotion
  class GenericElementAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers

    resource :generic_elements do
      namespace :klass do
        desc "get klass info"
        params do
          requires :name, type: String, desc: "element klass name"
        end
        get do
          ek = ElementKlass.find_by(name: params[:name])
          present ek, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end

      namespace :klasses do
        desc "get klasses"
        get do
          list = ElementKlass.where(is_active: true)
          present list, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end

      namespace :klasses_all do
        desc "get all klasses for admin function"
        get do
          list = ElementKlass.all
          present list, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end
      namespace :search do
        desc "search Generic Elements"
        params do
          optional :collectionId, type: Integer, desc: 'Collection id'
          optional :isSync, type: Integer, desc: 'isSync'
          optional :genericElName, type: String, desc: 'genericElName'
          optional :genericElProperties, type: Hash, desc: 'genericElProperties'
        end
        paginate per_page: 7, offset: 0, max_per_page: 100
        post do
          element_scope = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                          .find(params[:collectionId]).elements
          if params[:genericElName].present?
            element_scope = element_scope.where("name like (?)", "%#{params[:genericElName]}%")
          end

          params[:genericElProperties] && params[:genericElProperties].keys.each do |lk|
            layer = params[:genericElProperties][lk]
            qs = layer[:fields].select{ |f| f[:value].present? }
            qs.each do |f|
              query = {"#{lk}":{"fields":[{"field": "#{f[:field]}", "value":"#{f[:value]}"}]}}
              element_scope = element_scope.where("properties @> ?", query.to_json)
            end
          end

          reset_pagination_page(element_scope)
          paginate(element_scope).map{|s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized}


        end
      end

      desc 'Return serialized elements of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
        optional :el_type, type: String, desc: 'element klass name'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        scope = if params[:collection_id]
          begin
            collection_id = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
              .find(params[:collection_id])&.id
            element_ids = CollectionsElement.get_elements_by_collection_type(collection_id, params[:el_type])
            elements = Element.where(id: element_ids)
          rescue ActiveRecord::RecordNotFound
            Element.none
          end
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id])
              .collection.elements
          rescue ActiveRecord::RecordNotFound
            Element.none
          end
        else
          Element.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.includes(:tag, collections: :sync_collections_users).order("created_at DESC")

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        paginate(scope).map{|s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Return serialized element by id"
      params do
        requires :id, type: Integer, desc: "Element id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless current_user.matrix_check_by_name('genericElement') && ElementPolicy.new(current_user, Element.find(params[:id])).read?
        end

        get do
          element = Element.find(params[:id])
          {element: ElementPermissionProxy.new(current_user, element, user_ids).serialized }
        end
      end

      desc "Create a element"
      params do
        requires :element_klass, type: Hash
        requires :name, type: String
        optional :properties, type: Hash
        optional :collection_id, type: Integer
        requires :container, type: Hash
      end
      post do
        klass = params[:element_klass] || {}
        attributes = {
          name: params[:name],
          element_klass_id: klass[:id],
          properties: params[:properties],
          created_by: current_user.id
        }
        element = Element.create(attributes)
        #element_klass = ElementKlass.find(params[:klass][:id]);

        element.container = update_datamodel(params[:container])
        element.save!

        collection = Collection.find(params[:collection_id])
        CollectionsElement.create(element: element, collection: collection, element_type: klass[:name])
        CollectionsElement.create(element: element, collection: Collection.get_all_collection_for_user(current_user.id), element_type: klass[:name])

        element
      end

      desc "Update element by id"
      params do
        requires :id, type: Integer, desc: "element id"
        optional :name, type: String
        optional :properties, type: Hash
        requires :container, type: Hash
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Element.find(params[:id])).update?
        end

        put do
          update_datamodel(params[:container]);
          params.delete(:container);

          attributes = declared(params, include_missing: false)

          element = Element.find(params[:id])
          element.update(attributes)

          {element: ElementPermissionProxy.new(current_user, element, user_ids).serialized}
        end
      end

    end
  end
end
