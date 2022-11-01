# frozen_string_literal: true

module Chemotion
  class AttachableAPI < Grape::API
    resource :attachable do
      params do
        optional :files, type: Array[File], desc: 'files', default: []
        optional :attachable_type, type: String, desc: 'attachable_type'
        optional :attachable_id, type: Integer, desc: 'attachable id'
        optional :del_files, type: Array[Integer], desc: 'del file id', default: []
      end
      after_validation do
        case params[:attachable_type]
        when 'ResearchPlan'
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find_by(id: params[:attachable_id])).update?
        end
      end

      desc 'Update attachable records'
      post 'update_attachments_attachable' do
        attachable_type = params[:attachable_type]
        attachable_id = params[:attachable_id]
        if params.fetch(:files, []).any?
          attach_ary = []
          rp_attach_ary = []
          params[:files].each do |file|
            next unless (tempfile = file[:tempfile])

            a = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type],
              attachable_type: attachable_type,
              attachable_id: attachable_id
            )
            begin
              a.save!
              attach_ary.push(a.id)
              rp_attach_ary.push(a.id) if a.attachable_type.in?(%w[ResearchPlan Wellplate Element])
            ensure
              tempfile.close
              tempfile.unlink
            end
          end

          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{current_user.id}").perform_later(rp_attach_ary) if rp_attach_ary.any?
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{current_user.id}").perform_later(attach_ary) if attach_ary.any?
        end
        Attachment.where('id IN (?) AND attachable_type = (?)', params[:del_files].map!(&:to_i), attachable_type).update_all(attachable_id: nil) if params[:del_files].any?
        true
      end
    end
  end
end
