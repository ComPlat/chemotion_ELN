# frozen_string_literal: true

class ImportSamplesJob < ApplicationJob
  include ActiveJob::Status
  include ImportSamplesMethods

  queue_as :import_samples

#   after_perform do |job|
#     begin
#       Message.create_msg_notification(
#         channel_subject: Channel::COLLECTION_ZIP,
#         message_from: @user_id,
#         data_args: { col_labels: '', operation: 'import', expires_at: nil },
#         autoDismiss: 5
#       ) if @success
#     rescue StandardError => e
#       Delayed::Worker.logger.error e
#     end
#   end

  def perform(file_path, collection_id, user_id)
    @user_id = user_id
    @success = true
    begin
      import = Import::ImportSamples.new(file_path, collection_id, user_id)
      import.process(delayed_job: true)
    rescue => e
      puts e
      Delayed::Worker.logger.error e
      # Message.create_msg_notification(
      #   channel_subject: Channel::COLLECTION_ZIP_FAIL,
      #   message_from: @user_id,
      #   data_args: { col_labels: '', operation: 'import' },
      #   autoDismiss: 5,
      # )
      @success = false
    ensure
      # Clean up the temporary file after processing
      FileUtils.rm(file_path) if file_path && File.exist?(file_path)
    end
  end
end
