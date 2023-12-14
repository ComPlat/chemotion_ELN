# frozen_string_literal: true

module Chemotion
  class DeviceDescriptionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers

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
        scope.order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        # scope = scope.includes_for_list_display
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
        optional :name, type: String
        optional :short_label, type: String
        optional :vendor_name, type: String
        optional :vendor_id, type: String
        optional :vendor_url, type: String
        optional :serial_number, type: String
        optional :doi, type: String
        optional :doi_url, type: String
        optional :device_type, type: String
        optional :device_type_detail, type: String
        optional :operation_mode, type: String
        optional :installation_start_date, type: DateTime, allow_blank: true
        optional :installation_end_date, type: DateTime, allow_blank: true
        optional :description_and_comments, type: String
        optional :technical_operator, type: Hash
        optional :administrative_operator, type: Hash
        optional :university_campus, type: String
        optional :institute, type: String
        optional :building, type: String
        optional :room, type: String
        optional :infrastructure_assignment, type: String
        optional :access_options, type: String
        optional :comments, type: String
        optional :size, type: String
        optional :weight, type: String
        optional :application_name, type: String
        optional :application_version, type: String
        optional :description_for_method_part, type: String
      end
      post do
        attributes = declared(params, include_missing: false)
        device_description = DeviceDescription.create!(attributes)

        present device_description, with: Entities::DeviceDescriptionEntity, root: :device_description
      end

      # Return serialized device description by id
      params do
        requires :id, type: Integer, desc: 'Device description id'
      end
      route_param :id do
        get do
          device_description = DeviceDescription.find(params[:id])

          present device_description, with: Entities::DeviceDescriptionEntity, root: :device_description
        end
      end

      # update a device description
      params do
        requires :id, type: Integer
        optional :device_id, type: Integer, description: 'Linked device'
        optional :name, type: String
        optional :short_label, type: String
        optional :vendor_name, type: String
        optional :vendor_id, type: String
        optional :vendor_url, type: String
        optional :serial_number, type: String
        optional :doi, type: String
        optional :doi_url, type: String
        optional :device_type, type: String
        optional :device_type_detail, type: String
        optional :operation_mode, type: String
        optional :installation_start_date, type: DateTime, allow_blank: true
        optional :installation_end_date, type: DateTime, allow_blank: true
        optional :description_and_comments, type: String
        optional :technical_operator, type: Hash
        optional :administrative_operator, type: Hash
        optional :university_campus, type: String
        optional :institute, type: String
        optional :building, type: String
        optional :room, type: String
        optional :infrastructure_assignment, type: String
        optional :access_options, type: String
        optional :comments, type: String
        optional :size, type: String
        optional :weight, type: String
        optional :application_name, type: String
        optional :application_version, type: String
        optional :description_for_methods_part, type: String
      end
      put ':id' do
        device_description = DeviceDescription.find(params[:id])
        attributes = declared(params, include_missing: false)
        device_description.update!(attributes)

        present device_description, with: Entities::DeviceDescriptionEntity, root: :device_description
      end

      # delete a device description
      delete ':id' do
        device_description = DeviceDescription.find(params[:id])
        error!('Device could not be deleted', 400) unless device_description.present? && device_description.destroy

        { deleted: device_description.id }
      end
    end
  end
end
