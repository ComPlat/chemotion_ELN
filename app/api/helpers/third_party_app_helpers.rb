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

  # ---------------------------------------------------------------------------
  # Reaction-variations flow (parallel to the attachment helpers above).
  # ---------------------------------------------------------------------------

  # desc: prepare the token payload for the reaction-variations flow.
  # `columnOrder` carries the grid's visible columns in display order (their
  # colIds); it lives only in the browser, so the frontend must hand it to us
  # here to reach the TPA.
  def prepare_variations_payload
    @payload = {
      'appID' => params[:appID],
      'userID' => current_user.id,
      'reactionID' => params[:reactionID],
      'variationUuids' => params[:variationUuids] || [],
      'columnOrder' => params[:columnOrder] || [],
      'requestID' => SecureRandom.uuid,
    }
  end

  # desc: find records from a variations payload and set @cache_key to a
  # reaction-namespaced key (so reaction ids can't collide with attachment ids).
  def parse_variations_payload(payload = @payload)
    @user = User.find(payload['userID']&.to_i)
    @app = payload['appID'].to_i.zero? ? ThirdPartyApp.new : ThirdPartyApp.find(payload['appID']&.to_i)
    @reaction = Reaction.find(payload['reactionID']&.to_i)
    @variation_uuids = Array(payload['variationUuids'])
    @column_order = Array(payload['columnOrder'])
    @request_id = payload['requestID']
    @cache_key = "reaction/#{@reaction&.id}/#{@user&.id}/#{@app&.id}/#{@request_id}"

    error!('No read access to reaction', 403) unless ElementPolicy.new(@user, @reaction).read?
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

  # desc: return reaction variations JSON for download to third-party app.
  def download_variations_to_third_party_app
    update_cache(:download)
    return error!('No read access to reaction', 403) unless ElementPolicy.new(@user, @reaction).read?

    selected = @reaction.variations
                        .select { |v| @variation_uuids.include?(v['uuid']) }
                        .map(&:deep_symbolize_keys)

    labels = reaction_sample_labels(@reaction)
    selected.each { |row| annotate_material_names!(row, labels) }

    content_type 'application/json'
    {
      id: @reaction.id.to_s,
      request_id: @request_id,
      columnOrder: @column_order,
      variations: Entities::ReactionVariationEntity.represent(selected, serializable: true),
    }
  end

  # desc: store the statistics result POSTed back by the third-party app.
  def upload_variations_result_from_third_party_app
    update_cache(:upload)
    verify_variations_result_envelope!
    return error!('No write access to reaction', 403) unless ElementPolicy.new(@user, @reaction).update?

    ensure_reaction_container!

    dataset = @reaction.container.analyses_container.create_analysis_with_dataset!(name: 'Statistical Analysis')
    analysis = dataset.parent

    store_variations_result_files(dataset, params[:file])

    {
      message: 'Statistical analysis stored successfully',
      analysis_id: analysis.id,
      request_id: @request_id,
    }
  end

  # desc: integrity check on the echoed envelope.
  def verify_variations_result_envelope!
    if params[:request_id].present? && params[:request_id] != @request_id
      error!('request_id does not match the token', 422)
    end
    return if params[:id].blank? || params[:id].to_s == @reaction.id.to_s

    error!('id does not match the token', 422)
  end

  # desc: a reaction created through the API always carries a container, but be
  # defensive — build the root (+ analyses child) tree if one is somehow missing,
  # so the upload can't 500 on a container-less reaction.
  def ensure_reaction_container!
    return if @reaction.container

    @reaction.container = Container.create_root_container
    @reaction.save!
  end

  # desc: unpack the result.zip POSTed by OpenStats and attach its inner files to
  # the dataset.
  def store_variations_result_files(dataset, file)
    return error!('No result file uploaded', 422) if file.blank?

    excel = nil
    plot_index = 0
    Zip::File.open(file[:tempfile].path) do |zip|
      zip.each do |entry|
        next if entry.ftype == :directory

        case File.extname(entry.name).downcase
        when '.xlsx', '.xls'
          excel = attach_variations_entry(dataset, entry, "statistical_analysis#{File.extname(entry.name).downcase}")
        when '.json'
          attach_variations_entry(dataset, entry, 'variations_summary.json')
        when '.png'
          plot_index += 1
          attach_variations_entry(dataset, entry, "variations_plot_#{plot_index}.png")
        end
      end
    end
    notify_variations_result_uploaded(excel) if excel
  rescue Zip::Error
    error!('Uploaded result file is not a valid zip', 422)
  end

  # desc: materialise a single zip entry as a dataset Attachment under `filename`.
  def attach_variations_entry(dataset, entry, filename)
    tempfile = Tempfile.new(['variations_result', File.extname(filename)])
    begin
      tempfile.binmode
      tempfile.write(entry.get_input_stream.read)
      tempfile.flush
      Attachment.create!(
        attachable: dataset,
        created_by: @user.id,
        created_for: @user.id,
        filename: filename,
        file_path: tempfile.path,
      )
    ensure
      tempfile.close
      tempfile.unlink
    end
  end

  # desc: reuse the existing TPA attachment-arrival notification.
  def notify_variations_result_uploaded(attachment)
    Message.create_msg_notification(
      channel_subject: Channel::SEND_TPA_ATTACHMENT_NOTIFICATION,
      message_from: @user.id,
      attachment: Entities::NotificationAttachmentEntity.represent(attachment).as_json,
      data_args: { app: @app.name },
    )
  end

  # desc: map sample id => { name:, shortLabel: } for every sample in the reaction.
  def reaction_sample_labels(reaction)
    reaction.samples.each_with_object({}) do |sample, map|
      map[sample.id] = {
        name: sample.preferred_label.presence || sample.short_label,
        shortLabel: sample.short_label,
      }
    end
  end

  # desc: inject the resolved name/shortLabel into each material's aux.
  def annotate_material_names!(row, labels)
    %i[startingMaterials reactants products solvents].each do |material_type|
      row[material_type]&.each do |sample_id, material|
        next unless material[:aux]

        label = labels[sample_id.to_s.to_i]
        next unless label

        material[:aux][:name] = label[:name]
        material[:aux][:shortLabel] = label[:shortLabel]
      end
    end
    row
  end

  # desc: return file for download to third party app
  def download_attachment_to_third_party_app
    update_cache(:download)
    return error!('No read access to attachment', 403) unless read_access?(@attachment, @user)

    content_type 'application/octet-stream'
    header['Content-Length'] = attachment_filesize.to_s
    header['Content-Disposition'] = "attachment; filename=#{@attachment.filename}"
    env['api.format'] = :binary
    @attachment.read_file
  end

  # @note: Check file size before download from the third party app
  #  This is a temporary solution aroung the discrepency for some zip file of the recorded size vs actual on the fs
  #  see #463
  # @return [Integer] the file size in bytes
  def attachment_filesize
    if @attachment.attachment.mime_type == 'application/zip'
      path = @attachment.attachment.to_io.path
      return File.size(path)
    end
    @attachment.filesize
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

  # Build the url for the public reaction-variations endpoint.
  def variations_token_uri
    url = URI.parse Rails.application.config.root_url
    url.path = Pathname.new(url.path)
                       .join('/', API.prefix.to_s, API.version,
                             'public/third_party_app_variations', @token)
                       .to_s

    url
  end
end
