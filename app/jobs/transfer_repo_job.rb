class TransferRepoJob < ApplicationJob
  include ActiveJob::Status
  queue_as :transfer_to_repo

  def max_attempts
    1
  end

  after_perform do |job|
    begin
      # Sweep file in 24h
      CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 3.minutes)
                         .perform_later(job.job_id, 'zip')
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end if @success
  end

  def perform(collection_id, user_id, url, req_headers)
    begin
      resp = transfer_data(collection_id, url, req_headers)
      if resp.status == 200
        MoveToCollectionJob.set(queue: "move_to_collection_#{collection_id}").perform_now(collection_id)
      else
      end
    rescue StandardError => err
      Rails.logger.debug(err.backtrace)
    end
  end

  def transfer_data(collection_id, url, req_headers)
    @url = url
    @req_headers = req_headers
    @no_error = true

    begin
      export = Export::ExportCollections.new(job_id, [collection_id], 'zip', false, true)
      export.prepare_data
      data_file_path = export.to_file
      req_payload = {}
      req_payload[:data] = Faraday::UploadIO.new(
        data_file_path.to_s, 'application/zip', 'data.zip'
      )

      payload_connection = Faraday.new(url: @url) { |f|
        f.use FaradayMiddleware::FollowRedirects
        f.request :multipart
        f.headers = @req_headers.merge('Accept' => 'application/zip')
        f.adapter :net_http
      }
      @resp = payload_connection.post do |req|
        req.url('/api/v1/gate/receiving_zip')
        req.body = req_payload
      end
      @resp
    rescue StandardError => e
      Rails.logger.debug(error.backtrace)
      raise
    end
  end
end
