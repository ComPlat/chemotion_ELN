# frozen_string_literal: true

module Usecases
  module ScanTasks
    class Update
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute!
        task = ScanTask.where(id: @params[:id], created_by: @current_user.id, status: 'To do').includes(:sample).take
        error!('400 Bad Request', 400) if task.nil?

        file = @params[:file]
        attachment_id = nil
        if file.present? && file[:tempfile].present?
          tempfile = file[:tempfile]
          attachment = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            file_path: file[:tempfile],
            created_by: @current_user.id,
            created_for: @current_user.id,
            content_type: file[:type]
          )
          begin
            attachment.save!
            attachment_id = attachment.id
          ensure
            tempfile.close
            tempfile.unlink
          end

          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{@current_user.id}").perform_later(attachment.id)
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{@current_user.id}").perform_later(attachment.id)
        end

        task.update!(
          status: 'Done',
          measurement_value: @params[:measurement],
          measurement_unit: @params[:measurementUnit],
          description: @params[:description],
          private_note: @params[:privateNote],
          additional_note: @params[:additionalNote],
          attachment_id: attachment_id
        )
        sample = task.sample
        sample.update!(real_amount_value: @params[:measurement], real_amount_unit: @params[:measurementUnit], description: @params[:description])
        PrivateNote.create!(
          content: @params[:privateNote],
          noteable_id: sample[:id],
          noteable_type: 'Sample',
          created_by: @current_user.id
        )

        task
      end
    end
  end
end
