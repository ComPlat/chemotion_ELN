# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations

module Chemotion
  class AttachableAPI < Grape::API
    # Every attachable_type the frontend actually sends to update_attachments_attachable
    # (AttachmentFetcher.js#updateAttachables). Anything else is rejected below rather than
    # silently skipping authorization, as previously happened for every type but ResearchPlan.
    ATTACHABLE_CLASSES = {
      'ResearchPlan' => ResearchPlan,
      'Wellplate' => Wellplate,
      'DeviceDescription' => DeviceDescription,
      'SequenceBasedMacromoleculeSample' => SequenceBasedMacromoleculeSample,
      'SequenceBasedMacromolecule' => SequenceBasedMacromolecule,
    }.freeze

    helpers do
      # An SBMM is a shared reference record: Usecases::Sbmm::Finder reuses it across users by
      # accession/sequence, and ElementPolicy#update? passes for anyone owning a sample of it. Once
      # another user has a sample of it, only their own uploads may be detached - mirroring
      # Usecases::Sbmm::Sample#raise_if_sbmm_is_not_writable!, which locks the SBMM's fields then.
      def sbmm_shared_with_other_users?(attachable)
        return false unless attachable.is_a?(SequenceBasedMacromolecule)

        SequenceBasedMacromoleculeSample.user_count_for_sbmm(sbmm_id: attachable.id, except_user_id: current_user.id)
                                        .positive?
      end
    end

    resource :attachable do
      params do
        optional :files, type: [File], desc: 'files', default: []
        optional :attachable_type, type: String, desc: 'attachable_type'
        optional :attachable_id, type: Integer, desc: 'attachable id'
        optional :attfilesIdentifier, type: [String], desc: 'file identifier'
        optional :del_files, type: [Integer], desc: 'del file id', default: []
      end
      after_validation do
        klass = ATTACHABLE_CLASSES[params[:attachable_type]]
        @attachable = klass&.find_by(id: params[:attachable_id])
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
        # Scope the detach to the record authorized above, not just its type: otherwise an
        # attachable_id the caller owns plus someone else's attachment ids in del_files would
        # unlink the victim's attachments (unrecoverable, since an unlinked attachment has no
        # root element and even its owner can no longer download it).
        if params[:del_files].any?
          detachable = Attachment.where(id: params[:del_files], attachable: @attachable)
          detachable = detachable.where(created_for: current_user.id) if sbmm_shared_with_other_users?(@attachable)
          detachable.update_all(attachable_id: nil)
        end
        true
      end
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
