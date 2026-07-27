# frozen_string_literal: true

class ArchiveColdAttachmentsJob < ApplicationJob
  queue_as :archive_cold_attachments

  # How old (no reads/edits) before a file is eligible for cold storage.
  # Admins can override per deploy via the env var, without a code change.
  DEFAULT_AGE_MONTHS = 12
  AGE_ENV_VAR = 'ARCHIVE_COLD_ATTACHMENTS_AGE_MONTHS'

  # older_than defaults to the configured age so the cron scheduler (which calls
  # perform_later with no args) can run it; pass it explicitly to override.
  def perform(older_than: default_older_than, dry_run: false)
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

  private

  # Age threshold from the env var (in months), falling back to the default.
  def default_older_than
    months = ENV.fetch(AGE_ENV_VAR, nil).to_i
    months = DEFAULT_AGE_MONTHS unless months.positive?
    months.months.ago
  end
end
