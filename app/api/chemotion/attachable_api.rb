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
        # Accepts the element types Attachment#root_element resolves directly, each checked with
        # ElementPolicy#update?; other types (including 'Container') are rejected.
        attachable_type = params[:attachable_type]
        if Attachment::ELEMENT_ATTACHABLE_TYPES.include?(attachable_type)
          @attachable = attachable_type.constantize.find_by(id: params[:attachable_id])
        end
        error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, @attachable).update?
      end

      desc 'Update attachable records'
      post 'update_attachments_attachable' do
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
              attachable: @attachable,
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
        # The frontend's delete path for attachments of these elements: the rows are unlinked (left
        # to their uploader), not moved to the Unsorted inbox. Only attachments of the record
        # authorized above, and only those the user may change (Usecases::Attachments::Access#write?,
        # e.g. own uploads on an SBMM another user has a sample of).
        if params[:del_files].any?
          access = Usecases::Attachments::Access.new(current_user)
          writable = Attachment.where(id: params[:del_files], attachable: @attachable).select { |a| access.write?(a) }
          Attachment.where(id: writable.map(&:id)).update_all(attachable_id: nil)
        end
        true
      end
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
