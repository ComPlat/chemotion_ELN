# frozen_string_literal: true

module ThirdPartyAppHelpers
  extend Grape::API::Helpers

  # desc: expiry time for the token and the cached upload/download counters
  def expiry_time
    @expiry_time ||= TPA_EXPIRATION.from_now
  end

  # desc: instantiate local file cache for TPA
  def cache
    @cache ||= ActiveSupport::Cache::FileStore.new('tmp/ThirdPartyApp', expires_in: TPA_EXPIRATION)
  end

  # desc: fetch the token and download/upload counters from the cache
  def cached_token
    @cached_token ||= cache.read(cache_key)
  end

  # desc: define the cache key based on the attachment/user/app ids
  def cache_key
    @cache_key ||= "#{@attachment&.id}/#{@user&.id}/#{@app&.id}"
  end

  # desc: prepare the token payload from the params
  def prepare_payload
    @payload = {
      'appID' => params[:appID],
      'userID' => current_user.id,
      'attID' => params[:attID],
    }
  end

  # desc: find records from the payload
  def parse_payload(payload = @payload)
    @attachment = Attachment.find(payload['attID']&.to_i)
    @user = User.find(payload['userID']&.to_i)
    @app = payload['appID'].to_i.zero? ? ThirdPartyApp.new : ThirdPartyApp.find(payload['appID']&.to_i)

    error!('No read access to attachment', 403) unless read_access?(@attachment, @user)
  rescue ActiveRecord::RecordNotFound
    error!('Record not found', 404)
  end

  # desc: decrement the counters / check if token permission is expired
  def update_cache(key)
    return error!('Invalid token', 403) if cached_token.nil? || cached_token[:token] != params[:token]

    # TODO: expire token when both counters reach 0
    # IDEA: split counters into two caches?
    return error!("Token #{key} permission expired", 403) if cached_token[key].negative?

    cached_token[key] -= 1
    cache.write(cache_key, cached_token)
  end

  # desc: return file for download to third party app
  def download_attachment_to_third_party_app
    update_cache(:download)
    return error!('No read access to attachment', 403) unless read_access?(@attachment, @user)

    content_type 'application/octet-stream'
    header['Content-Length'] = @attachment.filesize.to_s
    header['Content-Disposition'] = "attachment; filename=#{@attachment.filename}"
    env['api.format'] = :binary
    @attachment.read_file
  end

  # desc: upload file from the third party app
  def upload_attachment_from_third_party_app
    update_cache(:upload)
    return error!('No write access to attachment', 403) unless write_access?(@attachment, @user)

    new_attachment = Attachment.new(
      attachable: @attachment.attachable,
      created_by: @attachment.created_by,
      created_for: @attachment.created_for,
      filename: params[:attachmentName].presence&.strip || "#{@app.name[0, 20]}-#{params[:file][:filename]}",
      file_path: params[:file][:tempfile].path,
    )
    if new_attachment.save

      Message.create_msg_notification(
        channel_subject: Channel::SEND_TPA_ATTACHMENT_NOTIFICATION,
        message_from: @user.id,
        attachment: Entities::NotificationAttachmentEntity.represent(new_attachment).as_json,
        data_args: { app: @app.name },
      )
    end
    { message: 'File uploaded successfully' }
  end

  def encode_and_cache_token(payload = @payload)
    @token = JsonWebToken.encode(payload, expiry_time)
    cache.write(
      cache_key,
      { token: @token, download: 3, upload: 10 },
      expires_at: expiry_time,
    )
  end

  # Build the url public endpoint with the token-path that can be used to fetch an attachment
  #
  # @note '@token' should be defined
  # @return [URI] the full url with token path
  def token_uri
    url = URI.parse Rails.application.config.root_url
    url.path = Pathname.new(url.path)
                       .join('/', API.prefix.to_s, API.version, 'public/third_party_apps', @token)
                       .to_s

    url
  end
end
