module Chemotion
  class DeviceAPI < Grape::API
    resource :devices do
      desc "Create Device"
      params do
        optional :title, type: String, desc: "device name"
        optional :code, type: String, desc: "device code hash"
        optional :types, type: Array, desc: "device types"
        optional :samples, type: Array, desc: "device samples"
      end
      post do
        attributes = declared(params, include_missing: false)
        device = Device.new(attributes.except!(:samples))
        params[:samples].map {|s|
          sample = DevicesSample.create({sample_id: s.id, device_id: device.id, types: s.types})
          device.devices_samples << sample
        }
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

      desc "set selected_device of user"
      route_param :id do
        post 'selected' do 
          device = Device.find_by(id: params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            user = User.find_by(id: device.user_id)
            unless user.nil?
              user.selected_device = device
              user.save!
              device.id
            end
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
            device.devices_samples.destroy_all
            device.devices_analyses.map{|d_a|
              d_a.analyses_experiments.destroy_all
              d_a.destroy
            }
            # delete as selected_device
            user = User.find_by(id: device.user_id)
            if !user.nil? && user.selected_device == device
              user.selected_device = nil
              user.save!
            end

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
        optional :samples, type: Array, desc: "device samples"
      end
      route_param :id do
        put do
          attributes = declared(params, include_missing: false)
          device = Device.find(params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            # update devices_samples
            old_sample_ids = device.devices_samples.map {|devices_sample| devices_sample.sample_id}
            new_sample_ids = params[:samples].map {|s|
              sample = DevicesSample.find_by(sample_id: s.id)
              params = {sample_id: s.id, device_id: device.id, types: s.types}
              if sample.nil?
                sample = DevicesSample.create(params)
                device.devices_samples << sample
              else
                sample.update(params)
              end
              sample.sample_id
            }
            to_remove_sample_ids = old_sample_ids - new_sample_ids
            to_remove_sample_ids.map{|sample_id| 
              device.devices_samples.find_by(sample_id: sample_id).destroy
            }

            device.update(attributes.except!(:samples))
            # FIXME how to prevent this?
            Device.find(params[:id])
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
