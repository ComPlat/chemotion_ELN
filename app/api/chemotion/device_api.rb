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
        params[:samples].map { |s|
          sample = DevicesSample.create({ sample_id: s.sample_id, device_id: device.id, types: s.types })
          device.devices_samples << sample
        }
        device.save!
        current_user.devices << device

        present device, with: Entities::DeviceEntity, root: :device
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
            present device, with: Entities::DeviceEntity, root: :device
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
            device.devices_analyses.map { |d_a|
              d_a.analyses_experiments.destroy_all
              d_a.destroy
            }
            # delete as selected_device
            user = User.find_by(id: device.user_id)
            if !user.nil? && user.selected_device == device
              user.selected_device = nil
              user.save!
            end

            present device.destroy, with: Entities::DeviceEntity, root: :device
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
            old_sample_ids = device.devices_samples.map { |devices_sample| devices_sample.id }
            new_sample_ids = params[:samples].map { |s|
              sample = DevicesSample.find_by(id: s.id)
              params = { sample_id: s.sample_id, device_id: device.id, types: s.types }
              if sample.nil?
                sample = DevicesSample.create!(params)
                device.devices_samples << sample
              else
                # were types deleted?
                deleted_types = sample.types - s.types
                deleted_types.map { |type|
                  analysis = device.devices_analyses.find_by(analysis_type: type)
                  experiment = analysis.analyses_experiments.find_by(devices_sample_id: s.id)
                  experiment.destroy!
                }

                sample.update!(params)
              end
              sample.id
            }
            to_remove_sample_ids = old_sample_ids - new_sample_ids
            to_remove_sample_ids.map { |sample_id|
              device.devices_samples.find_by(id: sample_id).destroy
            }

            device.update(attributes.except!(:samples))
            # FIXME how to prevent this?
            Device.find(params[:id])
          end
        end
      end

      desc "get Devices"
      get do
        present Device.all, with: Entity::DeviceEntity, root: :devices
      end

      namespace :remote do

        before do
          error!("401 Unauthorized", 401) unless current_user.is_a?(Admin) or current_user.is_super_device
        end

        namespace :create do
          desc 'create a new Device'
          params do
            requires :first_name, type: String
            requires :last_name, type: String
            optional :email, type: String, regexp: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
            requires :name_abbreviation, type: String
          end
          after_validation do
            @group_params = declared(params, include_missing: false)
            @group_params[:email] ||= format('%<time>i@eln.edu', time: Time.now.getutc.to_i)
            @group_params[:password] = Devise.friendly_token.first(8)
            @group_params[:password_confirmation] = @group_params[:password]
          end
          post do
            new_obj = Device.new(@group_params)
            begin
              new_obj.save!
              present new_obj, with: Entities::GroupDeviceEntity
            rescue ActiveRecord::RecordInvalid => e
              error!(e.message, 409)
            end
          end
        end

        desc "Generate a device JWT token"
        namespace :jwt do
          params do
            requires :id, type: Integer, desc: "device id"
          end
          route_param :id do
            get do
              device = Device.find(params[:id])

              payload = {
                first_name: device.first_name,
                user_id: device.id,
                last_name: device.last_name,
              }
              exp_date =  6.months.from_now
              jwt = JsonWebToken.encode(payload, exp_date)

              { token: jwt, exp_date: exp_date.strftime('%d.%m.%Y, %H:%M') }
            end
          end
        end
      end
    end
  end
end
