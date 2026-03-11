class ImportCollectionsJob < ApplicationJob
  include ActiveJob::Status

  queue_as :import_collections

  after_perform do
    if @success
      labels = @created_collection_labels.is_a?(Array) ? @created_collection_labels.join(', ') : ''
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP,
        message_from: @user_id,
        data_args: { col_labels: '', operation: 'import', expires_at: nil },
        url: @log_file_path,
        autoDismiss: 5,
      )
    end
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  def perform(att, current_user_id)
    @user_id = current_user_id
    @success = true
    @created_collection_labels = []

    begin
      import = Import::ImportCollections.new(att, current_user_id)
      import.extract
      import.import!
      @log_file_path = import.log_file_path
      @created_collection_labels = import.created_collection_labels
    rescue StandardError => e
      Delayed::Worker.logger.error e
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP_FAIL,
        message_from: @user_id,
        data_args: { col_labels: '', operation: 'import' },
        autoDismiss: 5,
      )
      @success = false
    ensure
      att&.destroy!
    end
  end

  def max_attempts
    1
  end
end
