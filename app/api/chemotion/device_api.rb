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
        params[:samples].map {|sample|
          DevicesSample.create({sample_id: sample.id, device_id: device.id})
        }
        device.save!
        current_user.devices << device
        device
      end

      desc "get Device by Id"
      params do
        requires :id, type: Integer, desc: "Device id"
      end
        get '/:id' do
          device = Device.find_by(id: params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            device
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
            new_sample_ids = params[:samples].map {|sample|
              DevicesSample.create({sample_id: sample.id, device_id: device.id})
              sample.id
            }
            to_remove_sample_ids = old_sample_ids - new_sample_ids
            to_remove_sample_ids.map{|sample_id| 
              #samples
              device.devices_samples.find_by(sample_id: sample_id).destroy
              #analyses
              device.devices_analyses.where(sample_id: sample_id).destroy_all
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

      desc "Create Device Analysis"
      params do
        requires :id, type: Integer, desc: "device id"
        requires :sample_id, type: Integer, desc: "sample id"
        requires :analysis_type, type: String, desc: "analysis type"
      end
      post '/:id/samples/:sample_id/:analysis_type' do
        analysis = DevicesAnalysis.new(
          device_id: params[:id],
          sample_id: params[:sample_id],
          analysis_type: params[:analysis_type]
        )
        analysis.save!
        
        device = Device.find(params[:id])
        device.devices_analyses << analysis
        device.save!
        analysis
      end

      desc "get nmr Analysis"
      params do
        requires :id, type: Integer, desc: "device id"
        requires :sample_id, type: Integer, desc: "sample id"
        requires :analysis_type, type: String, desc: "analysis type"
      end
      get '/:id/samples/:sample_id/:analysis_type' do
        analysis = DevicesAnalysis.find_by(
          device_id: params[:id],
          sample_id: params[:sample_id],
          analysis_type: params[:analysis_type]
        )
        if analysis.nil?
          error!("404 Analysis of Device not found", 404)
        else
          analysis
        end
      end
      
      desc "Update analysis"
      params do
        requires :id, type: Integer, desc: "device id"
        requires :sample_id, type: Integer, desc: "sample id"
        requires :analysis_type, type: String, desc: "analysis type"
        optional :experiments, type: Array, desc: "analysis experiments"
      end
      put '/:id/samples/:sample_id/:analysis_type' do
        analysis = DevicesAnalysis.find_by(
          device_id: params[:id],
          sample_id: params[:sample_id],
          analysis_type: params[:analysis_type]
        )
        if analysis.nil?
          error!("404 Analysis of Device not found", 404)
        else
          # update analyses_experiments
          old_experiment_ids = analysis.analyses_experiments.map {|experiment| experiment.id}
          new_experiment_ids = params[:experiments].map {|experiment|
            new_experiment = AnalysesExperiment.create({
              devices_analysis_id: analysis.id,
              holder_id: experiment.holder_id,
              status: experiment.status,
              solvent: experiment.solvent,
              experiment: experiment.experiment,
              checkbox: experiment.checkbox,
              on_day: experiment.on_day,
              number_of_scans: experiment.number_of_scans, 
              numeric: experiment.numeric,
              time: experiment.time,
            })
            analysis.analyses_experiments << new_experiment
            new_experiment.id
          }
          to_remove_experiment_ids = old_experiment_ids - new_experiment_ids
          to_remove_experiment_ids.map{|experiment_id| 
            analysis.analyses_experiments.find_by(id: experiment_id).destroy
          }

          analysis.save!
          # FIXME how to prevent this extra query? data has changed!
          DevicesAnalysis.find_by(
            device_id: params[:id],
            sample_id: params[:sample_id],
            analysis_type: params[:analysis_type]
          )
        end
      end
    end
  end
end
