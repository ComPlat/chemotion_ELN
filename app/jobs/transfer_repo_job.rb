# frozen_string_literal: true

class TransferRepoJob < ApplicationJob
  include ActiveJob::Status
  queue_as :transfer_to_repo

  def max_attempts
    1
  end

  after_perform do |job|
    CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 3.minutes).perform_now(job.job_id, 'zip')
  rescue StandardError => e
    log_exception('after_perform', e)
  end

  def perform(collection_id, user__id, url, req_headers)
    @collection = Collection.find(collection_id)
    @user_id = user__id
    resp = transfer_data(collection_id, url, req_headers)
    if resp&.status == 200
      msg = JSON.parse(resp.body)&.fetch('message', nil) || '' if resp&.body.present?
      MoveToCollectionJob.perform_now(collection_id, msg)
    end
  rescue StandardError => e
    log_exception('perform', e)
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
  rescue StandardError => e
    log_exception('Exporting data error', e)
    raise StandardError, "Exporting data error: #{e.message}"
  end

  # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
  def transfer_data(collection_id, url, req_headers)
    @url = url
    @req_headers = req_headers
    file = nil
    req_payload = payload(collection_id)
    connection = Faraday.new(url: @url) do |faraday|
      faraday.response :follow_redirects
      faraday.request :multipart
      faraday.headers = @req_headers.merge('Accept' => 'application/octet-stream')
    end
    resp = nil
    chunk_size = 10 * 1024 * 1024
    uuid = SecureRandom.uuid
    path = req_payload && req_payload[:data]&.local_path
    raise StandardError, 'Error in transfer_data: export data error' if path.nil?

    File.open(path, 'rb') do |f|
      file = f
      while (chunk = file.read(chunk_size))
        payload = { uuid: uuid, chunk: Faraday::UploadIO.new(StringIO.new(chunk), 'application/octet-stream') }
        resp = if file.eof?
                 connection.post '/api/v1/gate/received', payload
               else
                 connection.post '/api/v1/gate/receiving_chunk', payload
               end
        raise StandardError, "Error in transfer_data: #{resp.status}, #{resp.body}" if resp.status != 200
      end
    end
    resp
  rescue StandardError => e
    log_exception('transfer_data', e)
    raise e
  ensure
    file&.close
    File.unlink(path) if !path.nil? && File.exist?(path)
  end
  # rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

  def send_message(user_id, message, level)
    Message.create_msg_notification(
      channel_subject: Channel::GATE_TRANSFER_NOTIFICATION,
      data_args: { comment: message },
      level: level,
      message_from: user_id,
    )
  rescue StandardError => e
    log_exception('send_message', e)
  end

  def log_exception(title, exception)
    repo_logger.error("[#{title}] user: [#{@user_id}] \n Exception: #{exception.message}")
    repo_logger.error(exception.backtrace.join("\n"))
  end

  def repo_logger
    @@repo_logger ||= Logger.new(Rails.root.join('log/transfer_repo.log'))
  end
end
