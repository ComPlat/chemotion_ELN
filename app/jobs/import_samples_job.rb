# frozen_string_literal: true

class ImportSamplesJob < ApplicationJob
  include ActiveJob::Status

  queue_as :import_samples

  after_perform :notify_user

  def perform(params)
    params = params.with_indifferent_access
    @user_id = params[:user_id]
    @collection_id = params[:collection_id]
    file_format = File.extname(params[:attachment]&.filename)

    case file_format
    when '.xlsx', '.csv'
      @result = Import::ImportSamples.new(
        params[:attachment],
        @collection_id,
        @user_id,
        params[:attachment].filename,
        params[:import_type],
      ).process
    when '.sdf'
      sdf_import = Import::ImportSdf.new(
        collection_id: @collection_id,
        current_user_id: @user_id,
        rows: params[:sdf_rows],
        mapped_keys: params[:mapped_keys],
        attachment: params[:attachment],
      )
      sdf_import.create_samples
      @result = { message: sdf_import.message }
    else
      @result = { message: "Unsupported format: #{file_format}" }
    end
  rescue StandardError => e
    Delayed::Worker.logger.error e
    @result ||= {
      status: 'invalid',
      message: "Error while parsing the file: #{e.message}",
      error: e.message,
      data: [],
    }
  end

  def max_attempts
    1
  end

  private

  def notify_user
    message = @result.is_a?(Hash) ? @result[:message] : nil
    status = @result.is_a?(Hash) ? @result[:status] : nil
    # Frontend NoticeButton already handles this action and refreshes current collection list.
    # Provide it on successful/complete import notifications.
    data_args = { message: message }
    data_args[:action] = 'RefreshSampleList'
    data_args[:collection_id] = @collection_id if @collection_id.present?
    data_args[:status] = status if status.present?
    Message.create_msg_notification(
      channel_subject: Channel::IMPORT_SAMPLES_NOTIFICATION,
      message_from: @user_id,
      message_to: [@user_id],
      data_args: data_args,
      collection_id: @collection_id,
      level: 'info',
      autoDismiss: 5,
    )
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end
end
