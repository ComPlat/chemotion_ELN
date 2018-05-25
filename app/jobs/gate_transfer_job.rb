# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class GateTransferJob < ActiveJob::Base
  # queue_as :gate_transfer

  def perform(id, url, req_headers, batch_size = 2)
    # ping remote
    connection = Faraday.new(url: url) do |f|
      f.use FaradayMiddleware::FollowRedirects
      f.headers = req_headers
      f.adapter :net_http
    end
    resp = connection.get { |req| req.url('/api/v1/gate/ping') }
    raise resp.reason_phrase unless resp.success?

    collection = Collection.find(id)

    reaction_ids = CollectionsReaction.select(:reaction_id)
                                      .where(collection_id: id)
                                      .limit(batch_size).pluck(:reaction_id)

    # NB: process all reactions first by selecting no sample if reactions are present.
    #     Export::ExportJson will automatically export reaction associated samples.
    sample_ids = if reaction_ids.present?
                   nil
                 else
                   CollectionsSample.select(:sample_id).where(collection_id: id)
                                    .limit(batch_size).pluck(:sample_id)
                 end
    begin
      exp = Export::ExportJson.new(
        collection_id: collection.id, sample_ids: sample_ids, reaction_id: reaction_ids
      ).export
      attachment_ids = exp.data.delete('attachments')
      attachments = Attachment.where(id: attachment_ids)
      data_file = Tempfile.new
      data_file.write(exp.to_json)
      data_file.rewind
      req_payload = {}
      req_payload[:data] = Faraday::UploadIO.new(
        data_file.path, 'application/json', 'data.json'
      )
      tmp_files = []
      attachments.each do |att|
        cont_type = att.content_type || MimeMagic.by_path(att.filename)&.type
        tmp_files << Tempfile.new(encoding: 'ascii-8bit')
        tmp_files[-1].write(att.read_file)
        tmp_files[-1].rewind
        req_payload[att.identifier] = Faraday::UploadIO.new(
          tmp_files[-1].path, cont_type, att.filename
        )
      end

      payload_connection = Faraday.new(url: url) { |f|
        f.use FaradayMiddleware::FollowRedirects
        f.request :multipart
        f.headers = req_headers.merge('Accept' => 'application/json')
        f.adapter :net_http
      }
      resp = payload_connection.post { |req|
        req.url('/api/v1/gate/receiving')
        req.body = req_payload
      }
      if resp.success?
        tr_col = collection.children.find_or_create_by(
          user_id: collection.user_id, label: 'transferred'
        )
        CollectionsSample.move_to_collection(
          sample_ids, collection, tr_col.id
        ) if sample_ids.present?
        CollectionsReaction.move_to_collection(
          reaction_ids, collection, tr_col.id
        ) if reaction_ids.present?
      end
      # status(resp.status)
    ensure
      data_file.close
      data_file.unlink
      tmp_files.each do |tf|
        tf.close
        tf.unlink
      end
    end
    no_sample_left = CollectionsSample.select(:sample_id).where(collection_id: id)
                                      .limit(batch_size).pluck(:sample_id).empty?
    unless no_sample_left
      GateTransferJob.set(queue: "gate_transfer_#{collection.id}")
                     .perform_later(id, url, req_headers, batch_size)
    end
    true
  end
end
