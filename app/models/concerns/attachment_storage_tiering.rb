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

  # @return [Boolean] whether the file moved
  def move_to_cold(older_than: nil)
    move_to_tier(cold_storage_key, older_than: older_than)
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
      previous = Thread.current[:suppress_attachment_read_tracking]
      Thread.current[:suppress_attachment_read_tracking] = true
      yield
    ensure
      Thread.current[:suppress_attachment_read_tracking] = previous
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

  def move_to_tier(storage_key, older_than: nil)
    self.class.suppress_read_tracking do
      # Lock the row, then re-check so concurrent moves and fresh reads win.
      old = with_lock { copy_to_tier(storage_key) unless skip_move?(storage_key, older_than) }

      # Delete last, after the move is committed, so a crash can't lose the file.
      next false unless old

      delete_old_copies(old)
      true
    end
  end

  def skip_move?(storage_key, older_than)
    return true if older_than && last_accessed_at && last_accessed_at > older_than

    file = attachment_attacher.file
    # :cache means mid-upload, not persisted yet
    file.nil? || file.storage_key == :cache || file.storage_key == storage_key
  end

  def copy_to_tier(storage_key)
    attacher = attachment_attacher
    old = { file: attacher.file, derivatives: attacher.derivatives }
    flat_image_name = attachment_data.dig('derivatives', 'annotation', 'annotated_file_location')

    old[:file].rewind # or we copy from a mid-read cursor and lose bytes
    attacher.set attacher.upload(old[:file], storage_key)
    if old[:derivatives].present?
      attacher.set_derivatives attacher.upload_derivatives(old[:derivatives], storage: storage_key)
    end
    old[:flat_image] = copy_flat_image(flat_image_name, old[:file].storage, attacher.file.storage)

    # a normal save gets reverted by this model's callbacks
    update_column('attachment_data', attachment_data) # rubocop:disable Rails/SkipsModelValidations
    old
  end

  def delete_old_copies(old)
    old[:file].delete
    attachment_attacher.delete_derivatives(old[:derivatives]) if old[:derivatives].present?
    FileUtils.rm_f(old[:flat_image]) if old[:flat_image]
  end

  # The annotated image is written next to the file, outside Shrine's derivatives.
  def copy_flat_image(name, from_storage, to_storage)
    return nil if name.blank?

    source = File.join(from_storage.directory, name)
    return nil unless File.file?(source)

    target = File.join(to_storage.directory, name)
    FileUtils.mkdir_p(File.dirname(target))
    FileUtils.cp(source, target)
    attachment_data['derivatives']['annotation']['annotated_file_location'] = name # Shrine drops extra keys
    source
  end
end
