# frozen_string_literal: true

module Chemotion
  class AdminDeviceAPI < Grape::API
    resource :admin_devices do
      # List all devices
      get do
        devices = Device.all.order('name')
        present devices, with: Entities::DeviceEntity, root: 'devices'
      end

      # Find top (5) matched device by name
      params do
        requires :name, type: String, desc: 'device name'
        optional :limit, type: Integer, default: 5
      end
      route_param :byname do
        get do
          return { devices: [] } if params[:name].blank?

          devices = Device.by_name(params[:name]).limit(params[:limit])
          present devices, with: Entities::DeviceEntity, root: 'devices'
        end
      end

      # Find by device id

      # Create a new device
      params do
        requires :name, type: String
        requires :name_abbreviation, type: String
        optional :serial_number, type: String
        optional :verification_status, type: String
        optional :account_active, type: Boolean
        optional :visibility, type: Boolean
      end
      after_validation do
        @attributes = declared(params, include_missing: false)
        @attributes[:email] = format('%<time>i@eln.edu', time: Time.now.getutc.to_i)
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
        optional :serial_number, type: String
        optional :verification_status, type: String
        optional :account_active, type: Boolean
        optional :visibility, type: Boolean
        optional :people, type: Array
        optional :groups, type: Array
        optional :datacollector_config, type: Hash
        optional :novnc_settings, type: Hash
        # optional :device_metadata, type: Hash
      end
      put ':id' do
        device = Device.find_by(id: params[:id])
        # new_users = params[:users] - device.users.pluck(:id)

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
          devices = Device.all.order('name')
          present devices, with: Entities::DeviceEntity, root: 'devices'
        end
      end
    end
  end
end
