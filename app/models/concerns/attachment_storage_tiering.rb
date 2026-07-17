# frozen_string_literal: true

# Archives cold attachments to the ':cold' tier and promotes them back to
# ':store'. See ArchiveColdAttachmentsJob and PromoteAttachmentJob.
module AttachmentStorageTiering
  extend ActiveSupport::Concern

  def cold?(older_than:)
    updated_at < older_than && (attachable.nil? || attachable.updated_at < older_than)
  end

  def move_to_cold
    move_to_tier(:cold)
  end

  def move_to_store
    move_to_tier(:store)
  end

  private

  def move_to_tier(storage_key)
    attacher = attachment_attacher
    return unless attacher.file
    return if attacher.file.storage_key == :cache # mid-upload, not persisted
    return if attacher.file.storage_key == storage_key

    old_file = attacher.file
    old_derivatives = attacher.derivatives

    old_file.rewind # or we copy from a mid-read cursor and lose bytes
    attacher.set attacher.upload(old_file, storage_key)
    if old_derivatives.present?
      attacher.set_derivatives attacher.upload_derivatives(old_derivatives, storage: storage_key)
    end

    # normal save is reverted by this model's callbacks; update_column isn't
    update_column('attachment_data', attachment_data) # rubocop:disable Rails/SkipsModelValidations

    # upload + persist first, delete last: a crash here leaves data intact
    old_file.delete
    attacher.delete_derivatives(old_derivatives) if old_derivatives.present?
  end
end
