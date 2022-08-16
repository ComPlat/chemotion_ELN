# frozen_string_literal: true

module Chemotion
  class ScanTaskAPI < Grape::API
    resource :scan_tasks do
      desc 'Get scan task list for current user'
      params do
        optional :status, type: String, desc: 'Status', default: 'To do'
      end
      get do
        tasks = ScanTask.where(created_by: @current_user.id, status: params[:status]).includes(:sample, :attachment).all
        present tasks, with: Entities::ScanTaskEntity, displayed_in_list: true
      end

      get ':id' do
        task = ScanTask.where(created_by: @current_user.id, id: params[:id]).includes(:sample, :attachment).take
        present task, with: Entities::ScanTaskEntity
      end

      desc 'Update scan task info'
      params do
        requires :id, type: Integer, desc: 'Task ID'
        requires :measurement, type: Float, desc: 'Measurement'
        optional :description, type: String, desc: 'Description'
        optional :measurementUnit, type: String, desc: 'Measurement Unit', default: 'g'
        optional :privateNote, type: String, desc: 'private_note'
        optional :additionalNote, type: String, desc: 'additional_note'
        optional :file, type: File, desc: 'File'
      end
      route_param :id do
        put do
          task = Usecases::ScanTasks::Update.new(declared(params, include_missing: false), current_user).execute!
          present task, with: Entities::ScanTaskEntity
        end
      end

      desc 'Add new free scan'
      params do
        requires :file, type: File, desc: 'File'
        optional :scan_data, type: JSON, desc: 'scan_data'
      end
      post 'free_scan' do
        Usecases::ScanTasks::FreeScanCreate.new(declared(params, include_missing: false), current_user).execute!
        true
      end

      desc 'Create Scan Task'
      params do
        requires :sample_id, type: Integer, desc: 'Sample Id'
      end
      post do
        @sample = Sample.find(params[:sample_id])
        @element_policy = ElementPolicy.new(@current_user, @sample)
        error!('401 Unauthorized', 401) unless @element_policy.read?

        task = ScanTask.create!(
          sample_id: @sample.id,
          created_by: @current_user.id
        )

        present task, with: Entities::ScanTaskEntity
      end
    end
  end
end
