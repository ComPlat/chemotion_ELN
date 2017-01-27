module Chemotion
  class DeviceAPI < Grape::API
    resource :devices do
      desc "Create Device"
      params do
        optional :title, type: String, desc: "device name"
        optional :code, type: String, desc: "device code hash"
        optional :types, type: Array, desc: "device types"
      end
      post do
        attributes = declared(params, include_missing: false)
        device = Device.new(attributes)
        device.save!
        current_user.devices << device
        device
      end

      desc "get Device by Id"
      params do
        requires :id, type: Integer, desc: "Device id"
      end
      route_param :id do
        get do
          device = Device.find_by(id: params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            device
          end
        end
      end

      desc "Delete a device by id"
      params do
        requires :id, type: Integer, desc: "device id"
      end
      route_param :id do
        delete do
          device = Device.find(params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            device.destroy
          end
        end
      end

      desc "Update Device by id"
      params do
        requires :id, type: Integer, desc: "device id"
        optional :title, type: String, desc: "device name"
        optional :code, type: String, desc: "device code hash"
        optional :types, type: Array, desc: "device types"
      end
      route_param :id do
        put do
          attributes = declared(params, include_missing: false)
          device = Device.find(params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            device.update!(attributes)
            device
          end
        end
      end

      desc "get Devices"
      get do
        Device.all
      end
    end
  end
end
