# frozen_string_literal: true

class ArchiveColdAttachmentsJob < ApplicationJob
  queue_as :archive_cold_attachments

  # older_than defaults to 12 months so the cron scheduler (which calls
  # perform_later with no args) can run it; pass it explicitly to override.
  def perform(older_than: 12.months.ago, dry_run: false)
    Attachment.where(updated_at: ...older_than).order(:updated_at).find_each do |attachment|
      next unless attachment.cold?(older_than: older_than)
      next if attachment.attachment.storage_key == :cold

      if dry_run
        Rails.logger.info("[ArchiveColdAttachmentsJob] would archive attachment #{attachment.id} (dry run)")
      else
        attachment.move_to_cold
        Rails.logger.info("[ArchiveColdAttachmentsJob] archived attachment #{attachment.id}")
      end
    end
  end
end
