# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations

module Chemotion
  class AttachableAPI < Grape::API
    resource :attachable do
      params do
        optional :files, type: [File], desc: 'files', default: []
        optional :attachable_type, type: String, desc: 'attachable_type'
        optional :attachable_id, type: Integer, desc: 'attachable id'
        optional :attfilesIdentifier, type: [String], desc: 'file identifier'
        optional :del_files, type: [Integer], desc: 'del file id', default: []
      end
      after_validation do
        case params[:attachable_type]
        when 'ResearchPlan'
          error!('401 Unauthorized', 401) unless ElementPolicy.new(
            current_user,
            ResearchPlan.find_by(id: params[:attachable_id]),
          ).update?
        end
      end

      desc 'Update attachable records'
      post 'update_attachments_attachable' do
        attachable_type = params[:attachable_type]
        attachable_id = params[:attachable_id]

        if params.fetch(:files, []).any?
          params[:files].each_with_index do |file, index|
            next unless (tempfile = file[:tempfile])

            a = Attachment.new(
              identifier: params[:attfilesIdentifier][index],
              bucket: file[:container_id],
              filename: file[:filename],
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type],
              attachable_type: attachable_type,
              attachable_id: attachable_id,
            )

            begin
              a.save!
            rescue StandardError
              status 413
            ensure
              tempfile.close
              tempfile.unlink
            end
          end
        end
        if params[:del_files].any?
          Attachment.where(id: params[:del_files].map!(&:to_i), attachable_type: attachable_type)
                    .update_all(attachable_id: nil)
        end
        true
      end
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
