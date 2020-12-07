module Chemotion
  class ComputeTaskAPI < Grape::API
    resource :compute_tasks do
      desc 'Return all computational tasks.'
      get :all, each_serializer: ComputedPropsSerializer do
        ComputedProp.where(creator: current_user.id).order(updated_at: :desc)
      end

      desc "Handle task by id"
      params do
        requires :id, type: Integer, desc: "Compute task id"
      end
      route_param :id do
        desc 'Check task status.'
        get :check, root: 'check', each_serializer: ComputedPropsSerializer do
          task = ComputedProp.find(params[:id])

          cconfig = Rails.configuration.compute_config
          uri = URI.parse(cconfig.server)
          uri.query = uri.fragment = nil
          uri.path = ""
          check_uri = "#{uri.to_s}/check/#{task.task_id}"

          req = HTTParty.get(check_uri)
          if req.code == 200
            task.status = req.body.downcase
            task.save!
          end

          [task]
        end

        desc 'Revoke task.'
        get :revoke, root: 'revoke', each_serializer: ComputedPropsSerializer do
          task = ComputedProp.find(params[:id])

          cconfig = Rails.configuration.compute_config
          uri = URI.parse(cconfig.server)
          uri.query = uri.fragment = nil
          uri.path = ""
          check_uri = "#{uri.to_s}/revoke/#{task.task_id}"

          req = HTTParty.get(check_uri)
          if req.code == 200
            task.status = 'revoked'
            task.save!
          end

          [task]
        end
      end

      desc 'Delete a task.'
      params do
        requires :id, type: Integer, desc: 'Task ID.'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ComputedProp.find(params[:id]).creator == current_user.id
        end

        delete do
          ComputedProp.find(params[:id]).destroy
        end
      end
    end
  end
end
