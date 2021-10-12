class ExportCollectionToRadarJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collection_to_radar

  after_perform do |job|
    begin
      # Email ELNer
      # CollectionMailer.mail_archive_completed(
      #   @user_id,
      #   @label,
      #   @link,
      # ).deliver_now

      # Notify ELNer
      # Message.create_msg_notification(
      #   channel_subject: Channel::ARCHIVE_RADAR,
      #   message_from: @user_id,
      #   data_args: {operation: 'Archive', label: @label },
      #   url: @link
      # )
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end if @success
  end

  def perform(collection_id, user_id)
    @success = true
    @collection_id = collection_id

    begin
      @labels = Collection.where(id: @collection_id).pluck(:label)
      export = Export::ExportRadar.new(job_id, collection_id, user_id)
      export.fetch_access_token
      export.store_dataset
      export.create_file
      export.upload_file
    rescue StandardError => e
      Delayed::Worker.logger.error e
      # Message.create_msg_notification(
      #   channel_subject: Channel::ARCHIVE_RADAR_FAIL,
      #   message_from: @user_id,
      #   data_args: { operation: 'Archive', col_labels: @labels}
      # )
      @success = false
    end
  end
end
