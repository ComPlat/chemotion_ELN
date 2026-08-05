# frozen_string_literal: true

class ArchiveColdAttachmentsJob < ApplicationJob
  queue_as :archive_cold_attachments

  # How old before a file is eligible. Overridable per deploy via the env var.
  DEFAULT_AGE_MONTHS = 12
  AGE_ENV_VAR = 'ARCHIVE_COLD_ATTACHMENTS_AGE_MONTHS'

  # older_than needs a default: the cron scheduler calls this with no args.
  def perform(older_than: default_older_than, dry_run: false)
    # Enabled without a cold tier would crash-loop on a nil storage, so bail early.
    if Attachment.cold_storage_keys.empty?
      problem = 'archive job enabled but no cold storage configured (set COLD_STORAGE_PATH)'
      Rails.logger.warn("[ArchiveColdAttachmentsJob] #{problem}")
      StorageHealthMailer.unavailable([problem]).deliver_now
      return
    end

    # Only the read guard can be done in SQL; it mirrors #last_read_at, so it never
    # drops a file cold? would keep. The age check needs root_element, hence Ruby.
    Attachment.where('COALESCE(last_accessed_at, updated_at) < ?', older_than)
              .includes(:attachable).find_each do |attachment|
      next unless attachment.cold?(older_than: older_than)

      file = attachment.attachment
      # a row without a file must not abort the whole sweep
      next if file.nil? || Attachment.cold_storage_keys.include?(file.storage_key)

      if dry_run
        Rails.logger.info("[ArchiveColdAttachmentsJob] would archive attachment #{attachment.id} (dry run)")
      else
        attachment.move_to_cold
        Rails.logger.info("[ArchiveColdAttachmentsJob] archived attachment #{attachment.id}")
      end
    end
  end

  private

  def default_older_than
    months = ENV.fetch(AGE_ENV_VAR, nil).to_i
    months = DEFAULT_AGE_MONTHS unless months.positive?
    months.months.ago
  end
end
