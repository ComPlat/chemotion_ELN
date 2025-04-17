# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
module Chemotion
  class DeviceDescriptionAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers

    helpers do
      params :create_params do
        requires :collection_id, type: Integer
      end

      params :update_params do
        requires :id, type: Integer
        optional :device_id, type: Integer
      end

      params :default_params do
        optional :name, type: String
        optional :short_label, type: String
        optional :device_type, type: String
        optional :device_type_detail, type: String
        optional :operation_mode, type: String
        optional :vendor_device_name, type: String
        optional :vendor_device_id, type: String
        optional :serial_number, type: String
        optional :vendor_company_name, type: String
        optional :vendor_id, type: String
        optional :description, type: String
        optional :general_tags, type: Array
        optional :version_number, type: String
        optional :version_installation_start_date, type: DateTime, allow_blank: true
        optional :version_installation_end_date, type: DateTime, allow_blank: true
        optional :version_identifier_type, type: String
        optional :version_doi, type: String
        optional :version_doi_url, type: String
        optional :version_characterization, type: String
        optional :operators, type: Array do
          optional :name, type: String
          optional :phone, type: String
          optional :email, type: String
          optional :type, type: String
          optional :comment, type: String
        end
        optional :university_campus, type: String
        optional :institute, type: String
        optional :building, type: String
        optional :room, type: String
        optional :infrastructure_assignment, type: String
        optional :access_options, type: String
        optional :access_comments, type: String
        optional :size, type: String
        optional :weight, type: String
        optional :weight_unit, type: String
        optional :application_name, type: String
        optional :application_version, type: String
        optional :vendor_url, type: String
        optional :helpers_uploaded, type: Boolean
        optional :policies_and_user_information, type: String
        optional :description_for_methods_part, type: String
        optional :container, type: Hash
        optional :ontologies, type: Array do
          optional :data, type: Hash
          optional :paths, type: Array
          optional :segments, type: Array
          optional :index, type: Integer
        end
        optional :segments, type: Array
        optional :setup_descriptions, type: Hash
        optional :maintenance_contract_available, type: String
        optional :maintenance_scheduling, type: String
        optional :contact_for_maintenance, type: Array do
          optional :company, type: String
          optional :contact, type: String
          optional :email, type: String
          optional :phone, type: String
          optional :comment, type: String
        end
        optional :planned_maintenance, type: Array do
          optional :date, type: Date
          optional :type, type: String
          optional :details, type: String
          optional :status, type: String
          optional :costs, type: Float
          optional :time, type: String
          optional :changes, type: String
        end
        optional :consumables_needed_for_maintenance, type: Array do
          optional :name, type: String
          optional :type, type: String
          optional :number, type: Integer
          optional :status, type: String
          optional :costs, type: Float
          optional :details, type: String
        end
        optional :unexpected_maintenance, type: Array do
          optional :date, type: Date
          optional :type, type: String
          optional :details, type: String
          optional :status, type: String
          optional :costs, type: Float
          optional :time, type: String
          optional :changes, type: String
        end
        optional :measures_after_full_shut_down, type: String
        optional :measures_after_short_shut_down, type: String
        optional :measures_to_plan_offline_period, type: String
        optional :restart_after_planned_offline_period, type: String
      end

      def device_description_with_entity(device_description)
        @element_policy = ElementPolicy.new(current_user, device_description)
        present(
          device_description,
          with: Entities::DeviceDescriptionEntity,
          detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: device_description)
                                                     .detail_levels,
          policy: @element_policy,
          root: :device_description,
        )
      end
    end

    resource :device_descriptions do
      # Return serialized device description by collection id
      params do
        optional :collection_id, type: Integer
        optional :sync_collection_id, type: Integer
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
      end
      paginate per_page: 5, offset: 0
      before do
        params[:per_page].to_i > 50 && (params[:per_page] = 50)
      end
      get do
        scope =
          if params[:collection_id]
            begin
              Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                        .find(params[:collection_id]).device_descriptions
            rescue ActiveRecord::RecordNotFound
              DeviceDescription.none
            end
          elsif params[:sync_collection_id]
            begin
              current_user.all_sync_in_collections_users.find(params[:sync_collection_id])
                          .collection.device_descriptions
            rescue ActiveRecord::RecordNotFound
              DeviceDescription.none
            end
          else
            # All collection of current_user
            DeviceDescription.joins(:collections)
                             .where(collections: { user_id: current_user.id }).distinct
          end
        scope = scope.order('updated_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.includes_for_list_display
        scope = scope.created_time_from(Time.zone.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.zone.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.zone.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.zone.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        device_descriptions = paginate(scope).map do |device_description|
          Entities::DeviceDescriptionEntity.represent(
            device_description,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: device_description)
                                                       .detail_levels,
          )
        end

        { device_descriptions: device_descriptions }
      end

      # create a device description
      params do
        use :default_params
        use :create_params
      end
      post do
        attributes = declared(params.except(:container), include_missing: false)
        attributes[:created_by] = current_user.id
        device_description = Usecases::DeviceDescriptions::Create.new(attributes, current_user).execute
        device_description.container = update_datamodel(params[:container]) if params[:container].present?
        device_description_with_entity(device_description)
      rescue ActiveRecord::RecordInvalid
        { errors: device_description.errors.messages }
      end

      # get segment klass ids by new ontology
      namespace :byontology do
        params do
          requires :id, type: Integer
          requires :ontology, type: Hash do
            optional :data, type: Hash
            optional :paths, type: Array
          end
        end
        put ':id' do
          device_description = DeviceDescription.find(params[:id])
          attributes = declared(params, include_missing: false)
          segment_klass_ids =
            Usecases::DeviceDescriptions::Update.new(attributes, device_description, current_user)
                                                .segment_klass_ids_by_new_ontology
          segment_klass_ids
        end
      end

      # get device descriptions by UI state
      namespace :ui_state do
        params do
          requires :ui_state, type: Hash, desc: 'Selected device descriptions from the UI' do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :collection_id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :limit, type: Integer, desc: 'Limit number of device descriptions'
        end

        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @device_descriptions =
            DeviceDescription.by_collection_id(cid).by_ui_state(params[:ui_state]).for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @device_descriptions).read?
        end

        post do
          @device_descriptions = @device_descriptions.limit(params[:limit]) if params[:limit]

          present @device_descriptions, with: Entities::DeviceDescriptionEntity, root: :device_descriptions
        end
      end

      # split device description into sub device description
      namespace :sub_device_descriptions do
        params do
          requires :ui_state, type: Hash, desc: 'Selected device descriptions from the UI'
        end
        post do
          ui_state = params[:ui_state]
          col_id = ui_state[:currentCollectionId]
          element_params = ui_state[:device_description]
          device_description_ids =
            DeviceDescription.for_user(current_user.id)
                             .for_ui_state_with_collection(element_params, CollectionsDeviceDescription, col_id)
          DeviceDescription.where(id: device_description_ids).find_each do |device_description|
            device_description.create_sub_device_description(current_user, col_id)
          end

          {} # JS layer does not use the reply
        end
      end

      # return serialized device description by id
      params do
        requires :id, type: Integer
      end
      route_param :id do
        get do
          device_description = DeviceDescription.find(params[:id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, device_description).read?

          device_description_with_entity(device_description)
        end
      end

      # update a device description
      params do
        use :update_params
        use :default_params
      end
      put ':id' do
        device_description = DeviceDescription.find(params[:id])
        error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, device_description).update?
        attributes = declared(params.except(:container), include_missing: false)
        device_description =
          Usecases::DeviceDescriptions::Update.new(attributes, device_description, current_user).execute
        device_description.container = update_datamodel(params[:container]) if params[:container].present?
        device_description_with_entity(device_description)
      rescue ActiveRecord::RecordInvalid
        { errors: device_description.errors.messages }
      end

      # delete a device description
      delete ':id' do
        device_description = DeviceDescription.find(params[:id])

        error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, device_description).destroy?
        error!('Device could not be deleted', 400) unless device_description.present? && device_description.destroy

        { deleted: device_description.id }
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
