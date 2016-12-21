module Chemotion
  class DeviceAPI < Grape::API
    resource :devices do
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
    end
  end
end
