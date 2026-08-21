class ExportCollectionsJob < ApplicationJob
  include ActiveJob::Status

  queue_as :export_collections

  after_perform do |job|
    begin
      # Sweep file in 24h
      CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 24.hours)
                         .perform_later(job.job_id, @extname)

      # Notify ELNer
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP,
        data_args: {
          expires_at: @expires_at,
          operation: 'Export',
          col_labels: @labels,
          skipped: skipped_notice,
        },
        message_from: @user_id,
        url: @link,
      )

      # Email ELNer
      CollectionMailer.mail_export_completed(
        @user_id,
        @labels,
        @link,
        @expires_at,
        @skipped_count.to_i,
      ).deliver_now
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end if @success
  end

  # Extra sentence appended to the export notification when attachments had to be left out.
  # Rendered on its own line: NoticeButton.js splits the message on newlines.
  #
  # @return [String] empty when the archive is complete
  def skipped_notice
    count = @skipped_count.to_i
    return '' if count.zero?

    "\n#{count} attachment#{'s' if count > 1} could not be included " \
      '(see description.txt in the archive).'
  end

  # @return [Integer] number of attachments left out of the archive; see
  #   {Export::ExportCollections#skipped_attachments}
  def run_export(collection_ids, extname, nested)
    export = Export::ExportCollections.new(job_id, collection_ids, extname, nested)
    export.prepare_data
    export.to_file
    export.skipped_attachments.size
  end

  def perform(collection_ids, extname, nested, user_id)
    @success = true
    @collection_ids = collection_ids
    @extname = extname
    @user_id = user_id
    begin
      @labels = Collection.where(id: collection_ids[0..9]).pluck(:label)
      @link = "#{Rails.application.config.root_url}/zip/#{job_id}.#{extname}"
      @expires_at = Time.now + 24.hours

      @skipped_count = run_export(collection_ids, extname, nested)
    rescue StandardError => e
      Delayed::Worker.logger.error e
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP_FAIL,
        message_from: @user_id,
        data_args: { operation: 'Export', col_labels: @labels}
      )
      fp = Rails.public_path.join(@extname, "#{job_id}.#{@extname}" )
      File.delete(fp) if File.exist?(fp)
      @success = false
    end
  end
end
