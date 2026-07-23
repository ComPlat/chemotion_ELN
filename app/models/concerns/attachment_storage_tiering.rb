# frozen_string_literal: true

# Archives cold attachments to the ':cold' tier and promotes them back to
# ':store'. See ArchiveColdAttachmentsJob and PromoteAttachmentJob.
module AttachmentStorageTiering
  extend ActiveSupport::Concern

  # Don't rewrite last_accessed_at on every single read; once per window is enough.
  READ_TRACKING_THROTTLE = 1.hour

  # Cold only if it hasn't been read recently AND the file + its chain are old.
  # A recent read keeps it hot even if the record hasn't been edited in years.
  # ponytail: skips middle containers; a mis-archive self-heals on next read.
  def cold?(older_than:)
    return false if last_read_at > older_than

    [updated_at, attachable&.updated_at, root_element&.updated_at].compact.all? { |t| t < older_than }
  end

  def move_to_cold
    move_to_tier(:cold)
  end

  def move_to_store
    move_to_tier(:store)
  end

  # A real read: record it, and if the file is archived, bring it back to hot.
  def track_read!
    record_access!
    promote_if_cold
  end

  # For read paths that bypass Shrine (e.g. image serving).
  def promote_if_cold
    return unless attachment_attacher.file&.storage_key == :cold

    PromoteAttachmentJob.perform_later(id)
  end

  class_methods do
    # Called from tiered storage on every read; file_id is the Shrine file id.
    def on_read(file_id)
      return if read_tracking_suppressed?

      find_by("attachment_data->>'id' = ?", file_id)&.track_read!
    end

    # Internal tier moves read files too — don't count those as user reads.
    def suppress_read_tracking
      Thread.current[:suppress_attachment_read_tracking] = true
      yield
    ensure
      Thread.current[:suppress_attachment_read_tracking] = false
    end

    def read_tracking_suppressed?
      Thread.current[:suppress_attachment_read_tracking] == true
    end
  end

  private

  # No access recorded yet (old rows) → fall back to the edit date so it works day one.
  def last_read_at
    last_accessed_at || updated_at
  end

  def record_access!
    return if last_accessed_at && last_accessed_at > READ_TRACKING_THROTTLE.ago

    now = Time.current
    # update_all/increment_counter skip callbacks and leave updated_at untouched
    self.class.where(id: id).update_all(last_accessed_at: now) # rubocop:disable Rails/SkipsModelValidations
    self.class.increment_counter(:access_count, id) # rubocop:disable Rails/SkipsModelValidations
    self.last_accessed_at = now
  end

  def move_to_tier(storage_key)
    self.class.suppress_read_tracking do
      attacher = attachment_attacher
      next unless attacher.file
      next if attacher.file.storage_key == :cache # mid-upload, not persisted
      next if attacher.file.storage_key == storage_key

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
end
