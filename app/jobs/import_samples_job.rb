# frozen_string_literal: true

class ImportSamplesJob < ApplicationJob
  include ActiveJob::Status

  queue_as :import_samples

  after_perform do
    Message.create_msg_notification(
      channel_subject: Channel::IMPORT_SAMPLES_NOTIFICATION,
      message_from: @user_id,
      message_to: [@user_id],
      data_args: { message: @result[:message] },
      level: 'info',
      autoDismiss: 5,
    )
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  def perform(file_path, collection_id, user_id, file_name)
    @user_id = user_id
    begin
      import = Import::ImportSamples.new(file_path, collection_id, user_id, file_name)
      @result = import.process
    rescue StandardError => e
      Delayed::Worker.logger.error e
    ensure
      # Clean up the temporary file after processing
      FileUtils.rm(file_path) if file_path && File.exist?(file_path)
    end
  end
end
