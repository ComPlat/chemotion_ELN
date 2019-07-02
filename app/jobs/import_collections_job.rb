class ImportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :import_collections

  after_perform do |job|
    begin
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP,
        message_from: @user_id,
        data_args: { col_labels: '',  operation: 'import', expires_at: nil },
        autoDismiss: 5
      ) if @success
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end
  end

  def perform(att, current_user_id)
    @user_id = current_user_id
    @success = true
    begin
      import = Import::ImportCollections.new(att, current_user_id)
      import.extract
      import.import!
    rescue => e
      Delayed::Worker.logger.error e
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP_FAIL,
        message_from: @user_id,
        data_args: { col_labels: '',  operation: 'import' },
        autoDismiss: 5
      )
      @success = false
    end
  end
end
