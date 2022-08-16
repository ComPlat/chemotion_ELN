# frozen_string_literal: true

module Usecases
  module ScanTasks
    class FreeScanCreate
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute!
        free_scan_root_container = Container.find_or_create_by(name: 'free_scan_root', container_type: 'root', containable_id: @current_user.id)
        @current_user.container = free_scan_root_container

        free_scan_container = Container.create(
          name: 'free_scan',
          container_type: 'free_scan',
          parent_id: free_scan_root_container[:id],
          containable_id: free_scan_root_container[:id],
          extended_metadata: { scan_data: @params[:scan_data].to_json }
        )
        file = @params[:file]
        if file.present? && file[:tempfile].present?
          tempfile = file[:tempfile]
          attachment = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            file_path: file[:tempfile],
            created_by: @current_user.id,
            created_for: @current_user.id,
            content_type: file[:type],
            attachable_type: 'Container',
            attachable_id: free_scan_container[:id]
          )
          begin
            attachment.save!
          ensure
            tempfile.close
            tempfile.unlink
          end

          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{@user_id}").perform_later(attachment.id)
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{@user_id}").perform_later(attachment.id)
        end
      end
    end
  end
end
