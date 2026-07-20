# frozen_string_literal: true

# Archives cold attachments to the ':cold' tier and promotes them back to
# ':store'. See ArchiveColdAttachmentsJob and PromoteAttachmentJob.
module AttachmentStorageTiering
  extend ActiveSupport::Concern

  # Cold only if the file, its container, and its top element are all old.
  # ponytail: skips middle containers; a mis-archive self-heals on next read.
  def cold?(older_than:)
    [updated_at, attachable&.updated_at, root_element&.updated_at].compact.all? { |t| t < older_than }
  end

  def move_to_cold
    move_to_tier(:cold)
  end

  def move_to_store
    move_to_tier(:store)
  end

  # For read paths that bypass Shrine (e.g. image serving).
  def promote_if_cold
    return unless attachment_attacher.file&.storage_key == :cold

    PromoteAttachmentJob.perform_later(id)
  end

  class_methods do
    # Promote whichever attachment owns this Shrine file id (called from ColdStorage#open).
    def promote_by_file_id(file_id)
      attachment = find_by("attachment_data->>'id' = ?", file_id)
      PromoteAttachmentJob.perform_later(attachment.id) if attachment
    end
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
