# frozen_string_literal: true

class TransferRepoJob < ApplicationJob
  include ActiveJob::Status
  queue_as :transfer_to_repo

  def max_attempts
    1
  end

  after_perform do |job|
    if @success
      begin
        CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 3.minutes).perform_now(job.job_id, 'zip')
      rescue StandardError => e
        Delayed::Worker.logger.error e
      end
    end
  end

  def perform(collection_id, _user_id, url, req_headers)
    @collection = Collection.find(collection_id)
    resp = transfer_data(collection_id, url, req_headers)
    if resp.status == 200
      MoveToCollectionJob.set(queue: "move_to_collection_#{collection_id}").perform_now(collection_id)
    end
  rescue StandardError => e
    Rails.logger.debug(e.backtrace)
    send_message(@collection.user_id, e.message, 'error')
  end

  def payload(collection_id)
    export = Export::ExportCollections.new(job_id, [collection_id], 'zip', false, true)
    export.prepare_data
    data_file_path = export.to_file
    req_payload = {}
    req_payload[:data] = Faraday::UploadIO.new(
      data_file_path.to_s, 'application/zip', 'data.zip'
    )
    req_payload
  end

  def transfer_data(collection_id, url, req_headers)
    @url = url
    @req_headers = req_headers
    @no_error = true

    begin
      req_payload = payload(collection_id)
      payload_connection = Faraday.new(url: @url) do |faraday|
        faraday.response :follow_redirects
        faraday.request :multipart
        faraday.headers = @req_headers.merge('Accept' => 'application/zip')
      end
      @resp = payload_connection.post do |req|
        req.url('/api/v1/gate/receiving_zip')
        req.body = req_payload
      end
      @resp
    rescue StandardError => e
      Delayed::Worker.logger.error <<~TXT
        --------- gate to repo FAIL error message.BEGIN ------------
        message:  #{e.backtrace}
        --------- gate to repo FAIL error message.END ---------------
      TXT
      raise
    end
  end

  def send_message(user_id, message, level)
    Message.create_msg_notification(
      channel_subject: Channel::GATE_TRANSFER_NOTIFICATION,
      data_args: { comment: message },
      level: level,
      message_from: user_id,
    )
  end
end
