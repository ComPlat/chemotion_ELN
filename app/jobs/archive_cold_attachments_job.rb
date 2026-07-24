# frozen_string_literal: true

class ArchiveColdAttachmentsJob < ApplicationJob
  queue_as :archive_cold_attachments

  # older_than defaults to 12 months so the cron scheduler (which calls
  # perform_later with no args) can run it; pass it explicitly to override.
  def perform(older_than: 12.months.ago, dry_run: false)
    # includes(:attachable) preloads the parent so cold?/root_element don't do a
    # per-row query. find_each batches (its own id ordering; oldest-first isn't kept).
    Attachment.where(updated_at: ...older_than).includes(:attachable).find_each do |attachment|
      next unless attachment.cold?(older_than: older_than)

      file = attachment.attachment
      next if file.nil? || file.storage_key == :cold # nil = no file to move (don't crash the sweep)

      if dry_run
        Rails.logger.info("[ArchiveColdAttachmentsJob] would archive attachment #{attachment.id} (dry run)")
      else
        attachment.move_to_cold
        Rails.logger.info("[ArchiveColdAttachmentsJob] archived attachment #{attachment.id}")
      end
    end
  end
end
