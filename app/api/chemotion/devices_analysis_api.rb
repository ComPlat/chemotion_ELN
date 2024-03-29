module Chemotion
  class DevicesAnalysisAPI < Grape::API
    resource :devices_analysis do
      desc "Create Device Analysis"
      params do
        requires :device_id, type: Integer, desc: "device id"
        requires :analysis_type, type: String, desc: "analysis type"
        optional :experiments, type: Array, desc: "analysis experiments"
      end
      post do
        analysis = DevicesAnalysis.new(
          device_id: params[:device_id],
          analysis_type: params[:analysis_type]
        )
        analysis.save!
        
        params[:experiments].map {|experiment|
          new_experiment = AnalysesExperiment.create({
            devices_analysis_id: analysis.id,
            holder_id: experiment.holder_id,
            status: experiment.status,
            solvent: experiment.solvent,
            experiment: experiment.experiment,
            priority: experiment.priority,
            on_day: experiment.on_day,
            number_of_scans: experiment.number_of_scans, 
            sweep_width: experiment.sweep_width,
            time: experiment.time,
            sample_id: experiment.sample_id,
            devices_sample_id: experiment.devices_sample_id,
            sample_analysis_id: experiment.sample_analysis_id,
          })
          analysis.analyses_experiments << new_experiment
        }

        device = Device.find(params[:device_id])
        device.devices_analyses << analysis
        device.save!

        present analysis, with: Entities::DevicesAnalysisEntity, root: :devices_analysis
      end

      desc "get Devices Analysis"
      params do
        requires :id, type: Integer, desc: "device id"
      end
      route_param :id do
        get do
          analysis = DevicesAnalysis.find_by(params[:id])
          if analysis
            present analysis, with: Entities::DevicesAnalysisEntity, root: :devices_analysis
          else
            error!("404 Analysis of Device not found", 404)
          end
        end
      end
      
      desc "Update analysis"
      params do
        requires :id, type: Integer, desc: "device analysis id"
        optional :experiments, type: Array, desc: "analysis experiments"
      end
      route_param :id do
        put do
          analysis = DevicesAnalysis.find(params[:id])
          if analysis.nil?
            error!("404 Analysis of Device not found", 404)
          else
            # update analyses_experiments
            old_experiment_ids = analysis.analyses_experiments.map {|experiment| experiment.id}
            new_experiment_ids = params[:experiments].map {|experiment|
              analysis_experiment = AnalysesExperiment.find_by(id: experiment.id)
              params = {
                devices_analysis_id: analysis.id,
                holder_id: experiment.holder_id,
                status: experiment.status,
                solvent: experiment.solvent,
                experiment: experiment.experiment,
                priority: experiment.priority,
                on_day: experiment.on_day,
                number_of_scans: experiment.number_of_scans, 
                sweep_width: experiment.sweep_width,
                time: experiment.time,
                sample_id: experiment.sample_id,
                devices_sample_id: experiment.devices_sample_id,
                sample_analysis_id: experiment.sample_analysis_id,
              }
              if analysis_experiment.nil?
                analysis_experiment = AnalysesExperiment.create(params)
                analysis.analyses_experiments << analysis_experiment
              else
                analysis_experiment.update(params)
              end
              analysis_experiment.id
            }
            to_remove_experiment_ids = old_experiment_ids - new_experiment_ids
            to_remove_experiment_ids.map{|experiment_id| 
              analysis.analyses_experiments.find_by(id: experiment_id).destroy
            }

            analysis.save!
            # FIXME how to prevent this extra query? data has changed!
            present DevicesAnalysis.find(params[:id]), with: Entities::DevicesAnalysisEntity, root: :devices_analysis
          end
        end
      end
    end
  end
end

