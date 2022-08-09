# frozen_string_literal: true

module Chemotion
  class TaskAPI < Grape::API
    resource :tasks do
      before do
        @user_id = @current_user.id
      end
      desc 'Get task list for current user'
      params do
        optional :status, type: String, desc: 'Status', default: 'To do'
      end
      get do
        tasks = Task.where(created_by: @user_id, status: params[:status]).includes(:sample, :attachment).all
        Entities::TaskListEntity.represent(tasks, serializable: true)
      end

      get ':id' do
        tasks = Task.where(created_by: @user_id, id: params[:id]).includes(:sample, :attachment).take
        Entities::TaskEntity.represent(tasks, serializable: true)
      end

      desc 'Update task info'
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
          task = Task.where(id: params[:id], created_by: @user_id, status: 'To do').includes(:sample).take
          error!('400 Bad Request', 400) if task.nil?

          file = params[:file]
          attachment_id = nil
          if file.present? && file[:tempfile].present?
            tempfile = file[:tempfile]
            a = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              file_path: file[:tempfile],
              created_by: @user_id,
              created_for: @user_id,
              content_type: file[:type]
            )
            begin
              a.save!
              attachment_id = a.id
            ensure
              tempfile.close
              tempfile.unlink
            end

            TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{@user_id}").perform_later(a.id)
            TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{@user_id}").perform_later(a.id)
          end

          task.update!(
            status: 'Done',
            measurement_value: params[:measurement],
            measurement_unit: params[:measurementUnit],
            description: params[:description],
            private_note: params[:privateNote],
            additional_note: params[:additionalNote],
            attachment_id: attachment_id
          )
          sample = task.sample
          sample.update!(real_amount_value: params[:measurement], real_amount_unit: params[:measurementUnit], description: params[:description])
          PrivateNote.create!(
            content: params[:privateNote],
            noteable_id: sample[:id],
            noteable_type: 'Sample',
            created_by: @user_id
          )

          Entities::TaskEntity.represent(task, serializable: true)
        end
      end

      desc 'Add new free scan'
      params do
        requires :file, type: File, desc: 'File'
        optional :scan_data, type: JSON, desc: 'scan_data'
      end
      post 'free_scan' do
        current_user = User.find(@user_id)
        return if current_user.nil?

        free_scan_root_container = Container.where(name: 'free_scan_root', container_type: 'root', containable_id: @user_id).take
        current_user.container = Container.create(name: 'free_scan_root', container_type: 'root', containable_id: @user_id) unless free_scan_root_container

        free_scan_container = Container.create(
          name: 'free_scan',
          container_type: 'free_scan',
          parent_id: free_scan_root_container[:id],
          containable_id: free_scan_root_container[:id],
          extended_metadata: { scan_data: params[:scan_data].to_json }
        )
        file = params[:file]
        if file.present? && file[:tempfile].present?
          tempfile = file[:tempfile]
          a = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            file_path: file[:tempfile],
            created_by: @user_id,
            created_for: @user_id,
            content_type: file[:type],
            attachable_type: 'Container',
            attachable_id: free_scan_container[:id]
          )
          begin
            a.save!
          ensure
            tempfile.close
            tempfile.unlink
          end

          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{@user_id}").perform_later(a.id)
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{@user_id}").perform_later(a.id)
        end

        true
      end

      desc 'Create Task'
      params do
        requires :sample_id, type: Integer, desc: 'Sample Id'
      end
      post do
        @sample = Sample.find(params[:sample_id])
        @element_policy = ElementPolicy.new(current_user, @sample)
        error!('401 Unauthorized', 401) unless @element_policy.read?

        task = Task.create!(
          sample_id: @sample.id,
          created_by: current_user.id
        )
      end
    end
  end
end
