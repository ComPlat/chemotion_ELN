# frozen_string_literal: true

module Chemotion
  class DeviceDescriptionAPI < Grape::API
    resource :device_descriptions do
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
