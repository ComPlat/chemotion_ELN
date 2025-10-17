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
    file_format = File.extname(params[:attachment]&.filename)
    begin
      case file_format
      when '.xlsx', '.csv'
        @result = Import::ImportSamples.new(
          params[:attachment],
          params[:collection_id],
          @user_id,
          params[:attachment].filename,
          params[:import_type],
        ).process
      when '.sdf'
        sdf_args = {
          collection_id: params[:collection_id],
          current_user_id: @user_id,
          rows: params[:sdf_rows],
          mapped_keys: params[:mapped_keys],
          attachment: params[:attachment],
        }
        sdf_import = Import::ImportSdf.new(sdf_args)
        sdf_import.create_samples
        @result = {}
        @result[:message] = sdf_import.message
      end
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end
  end
end
