# frozen_string_literal: true

# Moves unused attachments to the ':cold' tier. See ArchiveAttachmentsJob.
module AttachmentStorageTiering
  extend ActiveSupport::Concern

  # One write per window is enough; reads can be frequent.
  READ_TRACKING_THROTTLE = 1.hour

  # Age comes from the root element, not the file: a file matters as long as its
  # Sample/Reaction does. Files with no element are the orphan sweep's business -
  # root_element would hand back the uploading user here, which proves nothing.
  def cold?(older_than:)
    return false if last_accessed_at.present? && last_accessed_at > older_than

    (root_element&.updated_at || updated_at) < older_than
  end

  def move_to_cold
    move_to_tier(cold_storage_key)
  end

  # With several shelves, spread files across them by id.
  def cold_storage_key
    shelves = self.class.cold_storage_keys
    return shelves.first if shelves.size <= 1

    group = (id - 1) / self.class.cold_router_group_size
    shelves[group % shelves.size]
  end

  def track_read!
    record_access!
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

    def cold_storage_keys
      Shrine.storages.keys.select { |k| k.to_s.match?(/\Acold\d*\z/) }.sort
    end

    def cold_router_group_size
      ENV.fetch('COLD_ROUTER_GROUP_SIZE', 10_000).to_i
    end
  end

  private

  def record_access!
    return if last_accessed_at && last_accessed_at > READ_TRACKING_THROTTLE.ago

    now = Time.current
    # Raw UPDATE so there's no updated_at bump, and no logidze entry for bookkeeping.
    Logidze.without_logging do
      self.class.where(id: id).update_all(['last_accessed_at = ?, access_count = access_count + 1', now]) # rubocop:disable Rails/SkipsModelValidations
    end
    self.last_accessed_at = now
  end

  def move_to_tier(storage_key)
    self.class.suppress_read_tracking do
      old_file = nil
      old_derivatives = nil

      # Lock the row, then re-check the tier so concurrent moves can't race.
      with_lock do
        attacher = attachment_attacher
        file = attacher.file
        next if file.nil?
        next if file.storage_key == :cache # mid-upload, not persisted
        next if file.storage_key == storage_key

        old_file = file
        old_derivatives = attacher.derivatives

        old_file.rewind # or we copy from a mid-read cursor and lose bytes
        attacher.set attacher.upload(old_file, storage_key)
        if old_derivatives.present?
          attacher.set_derivatives attacher.upload_derivatives(old_derivatives, storage: storage_key)
        end

        # a normal save gets reverted by this model's callbacks
        update_column('attachment_data', attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      # Delete last, after the move is committed, so a crash can't lose the file.
      next if old_file.nil?

      old_file.delete
      attachment_attacher.delete_derivatives(old_derivatives) if old_derivatives.present?
    end
  end
end
