class ExportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collections

  after_perform do |job|
    begin
      # Sweep file in 24h
      CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 24.hours)
                         .perform_later(job.job_id, @extname)

      # Email ELNer
      CollectionMailer.mail_export_completed(
        @user_id,
        @labels,
        @link,
        @expires_at
      ).deliver_now
      # Notify ELNer
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP,
        message_from: @user_id,
        data_args: {expires_at: @expires_at, operation: 'Export', col_labels: @labels}
      )
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end if @success
  end

  def perform(collection_ids, extname, nested, user_id)
    @success = true
    @collection_ids = collection_ids
    @extname = extname
    @user_id = user_id
    begin
      @labels = Collection.where(id: collection_ids[0..9]).pluck(:label)
      @link = if Rails.env.production?
                "https://#{ENV['HOST'] || ENV['SMTP_DOMAIN']}/zip/#{job_id}.#{extname}"
              else
                "http://#{ENV['HOST'] || 'localhost:3000'}/zip/#{job_id}.#{extname}"
              end
      @expires_at = Time.now + 24.hours

      export = Export::ExportCollections.new(job_id, collection_ids, extname, nested)
      export.prepare_data
      export.to_file
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
