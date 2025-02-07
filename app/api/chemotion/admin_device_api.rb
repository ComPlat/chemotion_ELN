# frozen_string_literal: true

module Chemotion
  class AdminDeviceAPI < Grape::API
    resource :admin_devices do
      before do
        error!(401) unless current_user.is_a?(Admin)
      end
      namespace :byname do
        # Find top (5) matched device by name
        params do
          requires :name, type: String, desc: 'device name'
          optional :limit, type: Integer, default: 5
        end
        get do
          return { devices: [] } if params[:name].blank?

          devices = Device.by_name(params[:name]).limit(params[:limit])
          present devices, with: Entities::DeviceEntity, root: 'devices'
        end
      end

      # List all devices
      get do
        devices = Device.order('name')
        present devices, with: Entities::DeviceEntity, root: 'devices'
      end

      # Find by device id
      params do
        requires :id, type: Integer
      end
      route_param :id do
        get do
          present Device.find(params[:id]), with: Entities::DeviceEntity, root: 'device'
        end
      end

      # Create a new device
      params do
        requires :name, type: String
        requires :name_abbreviation, type: String
        optional :email, type: String
        optional :serial_number, type: String
        optional :verification_status, type: String
        optional :account_active, type: Boolean
        optional :visibility, type: Boolean
      end
      after_validation do
        @attributes = declared(params, include_missing: false)
      end
      post do
        device = Device.new(@attributes)
        device.save!
        present device, with: Entities::DeviceEntity, root: 'device'
      rescue ActiveRecord::RecordInvalid
        { errors: device.errors.messages }
      end

      # Update a device
      params do
        requires :id, type: Integer
        requires :name, type: String
        requires :name_abbreviation, type: String
        optional :email, type: String
        optional :serial_number, type: String
        optional :verification_status, type: String
        optional :account_active, type: Boolean
        optional :visibility, type: Boolean
        optional :people, type: Array
        optional :groups, type: Array
        optional :datacollector_fields, type: Boolean, default: false
        optional :datacollector_method, type: String
        optional :datacollector_dir, type: String
        optional :datacollector_host, type: String
        optional :datacollector_user, type: String
        optional :datacollector_authentication, type: String
        optional :datacollector_key_name, type: String
        optional :datacollector_user_level_selected, type: Boolean
        optional :datacollector_number_of_files, type: Integer
        optional :novnc_target, type: String
        optional :novnc_token, type: String
        optional :novnc_password, type: String
      end
      after_validation do
        if params[:datacollector_fields] && params[:datacollector_method].end_with?('local')
          params[:datacollector_dir] = Pathname.new(params[:datacollector_dir]).realpath.to_path
        end
      end
      put ':id' do
        device = Device.find_by(id: params[:id])

        people = params[:people].present? ? Person.where(id: params[:people]) : []
        device.people = people
        groups = params[:groups].present? ? Group.where(id: params[:groups]) : []
        device.groups = groups

        attributes = declared(params.except(:users, :people, :groups), include_missing: false)
        device.update!(attributes)
        present device, with: Entities::DeviceEntity, root: 'device'
      rescue ActiveRecord::RecordInvalid
        { errors: device.errors.messages }
      end

      # Delete a device
      delete ':id' do
        device = Device.find_by(id: params[:id])
        error!('device could not be deleted', 400) unless device.present? && device.destroy

        { deleted: device.id }
      end

      # delete a user device relation
      params do
        requires :id, type: Integer
        requires :device_id, type: Integer
      end
      route_param :delete_relation do
        put ':id' do
          user = User.find(params[:id])
          user_device = UsersDevice.where(device_id: params[:device_id], user_id: params[:id]).first
          error!('device relation could not be deleted', 400) unless user_device.present? && user_device.destroy

          User.gen_matrix(user) if user.present?
          devices = Device.order('name')
          present devices, with: Entities::DeviceEntity, root: 'devices'
        end
      end

      # test datacollector sftp connection
      params do
        requires :id, type: Integer
        optional :datacollector_method, type: String
        optional :datacollector_host, type: String
        optional :datacollector_user, type: String
        optional :datacollector_authentication, type: String
        optional :datacollector_key_name, type: String
      end
      route_param :test_sftp do
        post do
          # make options hashie compatible
          options = Hashie::Mash.new declared(params, include_missing: false).merge(info: params[:id])
          Datacollector::Configuration.new!(options)

          { status: 'success', message: 'Test connection successfully.' }
        rescue StandardError => e
          { status: 'error', message: e.message }
        end
      end
    end
  end
end
