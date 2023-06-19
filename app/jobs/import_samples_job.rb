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

  def perform(params)
    @user_id = params[:user_id]
    file_path = params[:file_path]
    file_format = File.extname(params[:file_name])
    begin
      case file_format
      when '.xlsx'
        import = Import::ImportSamples.new(file_path, params[:collection_id], @user_id, params[:file_name])
        @result = import.process
      when '.sdf'
        sdf_import = Import::ImportSdf.new(
          collection_id: params[:collection_id],
          current_user_id: @user_id,
          rows: params[:sdf_rows],
          mapped_keys: params[:mapped_keys],
        )
        sdf_import.create_samples
        @result = {}
        @result[:message] = sdf_import.message
      end
    rescue StandardError => e
      Delayed::Worker.logger.error e
    ensure
      # Clean up the temporary file after processing
      FileUtils.rm(file_path) if file_path && File.exist?(file_path)
    end
  end
end
