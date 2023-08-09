# frozen_string_literal: true

module Chemotion
  class SampleTaskAPI < Grape::API
    rescue_from ActiveRecord::RecordInvalid do |exception|
      error!(exception.record.errors.full_messages.join("\n"), 400)
    end

    rescue_from ActiveRecord::RecordNotFound do
      error!('Sample not found', 400)
    end

    rescue_from Grape::Exceptions::ValidationErrors do |exception|
      error!(exception.message, 422)
    end

    resource :sample_tasks do # rubocop:disable Metrics/BlockLength
      # Index: List all scan tasks for the given parameters
      params do
        optional :status, type: String, values: %w[open with_missing_scan_results done], default: 'open'
      end
      get do
        tasks = SampleTask.for(current_user).public_send(params[:status]).order(created_at: :desc)

        present tasks, with: Entities::SampleTaskEntity
      end

      # create a new scan task
      params do
        optional :description, type: String
        optional :required_scan_results, type: Integer, default: 1
        optional :sample_id, type: Integer, description: 'ID of the sample to scan'
      end
      post do
        task = Usecases::SampleTasks::Create.new(
          params: declared(params, include_missing: false),
          user: current_user,
        ).perform!

        present task, with: Entities::SampleTaskEntity
      end

      # update a sample task
      params do
        optional :description, type: String
        optional  :sample_id,
                  type: Integer,
                  description: 'ID of the sample to scan'
      end
      put ':id' do
        updater = Usecases::SampleTasks::Update.new(
          params: params,
          user: current_user,
        )
        updater.perform!

        finisher = Usecases::SampleTasks::Finish.new(sample_task: updater.sample_task, user: current_user)
        finisher.perform! if finisher.sample_task_can_be_finished?

        present updater.sample_task, with: Entities::SampleTaskEntity
      end

      # delete an open sample task
      delete ':id' do
        task = SampleTask.for(current_user).open.find_by(id: params[:id])
        error!('Task could not be deleted', 400) unless task.present? && task.destroy

        { deleted: task.id }
      end

      route_param :id do
        resource :scan_results do
          params do
            requires :file, type: File # automatically provides subfields filename, type and tempfile
            requires :measurement_value, type: Float
            requires :measurement_unit, type: String
            optional :title, type: String
          end
          post do
            sample_task = SampleTask.for(current_user).open.find(params[:id])
            scan_result = Usecases::SampleTasks::AddScanResult.new(
              params: params,
              user: current_user,
              sample_task: sample_task,
            ).perform!

            finisher = Usecases::SampleTasks::Finish.new(sample_task: sample_task, user: current_user)
            finisher.perform! if finisher.sample_task_can_be_finished?

            present scan_result, with: Entities::ScanResultEntity
          end
        end
      end
    end
  end
end
