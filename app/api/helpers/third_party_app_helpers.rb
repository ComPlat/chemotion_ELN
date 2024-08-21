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
    @cached_token ||= cache.read(cache_key[1])
  end

  # desc: define the cache key based on the attachment/user/app ids
  def cache_key
    @user_key ||= @user&.id
    @cache_key_attachment_app ||= "#{@app&.id}/#{@attachment&.id}"
    [@user_key, @cache_key_attachment_app]
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
    # TODO: implement attachment authorization
    @attachment = Attachment.find(payload['attID']&.to_i)
    @user = User.find(payload['userID']&.to_i)
    @app = payload['appID'].to_i.zero? ? ThirdPartyApp.new : ThirdPartyApp.find(payload['appID']&.to_i)
  rescue ActiveRecord::RecordNotFound
    error!('Record not found', 404)
  end

  # desc: decrement the counters / check if token permission is expired
  def update_cache(key, token)
    parse_payload(token)
    cached_token
    if @cached_token.nil? || (@cached_token[:download] < 1 && @cached_token[:upload] < 1)
      cache.delete(cache_key[1])
      error!('Invalid token', 403)
    elsif @cached_token[key] < 1
      error!("Token #{key} permission expired", 403)
    else
      @cached_token[key] -= 1
      cache.write(cache_key[1], @cached_token)
    end
  end

  # desc: return file for download to third party app
  def download_attachment_to_third_party_app(token)
    update_cache(:download, token)
    return error!('No read access to attachment', 403) unless read_access?(@attachment, @user)

    content_type 'application/octet-stream'
    header['Content-Length'] = @attachment.filesize.to_s
    header['Content-Disposition'] = "attachment; filename=#{@attachment.filename}"
    env['api.format'] = :binary
    @attachment.read_file
  end

  # desc: upload file from the third party app
  def upload_attachment_from_third_party_app(token)
    update_cache(:upload, token)
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

  def encode_and_cache_token_user_collection_with_type
    current_state = cache.read(cache_key[0])
    new_state = if current_state
                  idx = current_state.index(cache_key[1])
                  idx.nil? ? current_state.push(cache_key[1]) : current_state
                else
                  [cache_key[1]]
                end
    cache.write(cache_key[0], new_state)
  end

  def encode_and_cache_token_attachment_app(payload = @payload)
    @token = JsonWebToken.encode(payload, expiry_time)
    cache.write(
      cache_key[1],
      { token: @token, download: 3, upload: 10 },
      expires_at: expiry_time,
    )
  end
end
