# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class GateTransferJob < ActiveJob::Base
  # queue_as :gate_transfer
  # job_options retry: false
  SAMPLE = 'Sample'
  REACTION = 'Reaction'
  STATE_BEFORE_TRANSFER = 'before transfer'
  STATE_TRANSFER = 'transferring'
  STATE_TRANSFERRED = 'transferred'


  def perform(id, url, req_headers)
    # ping remote
    @url = url
    @req_headers = req_headers

    connection = Faraday.new(url: @url) do |f|
      f.use FaradayMiddleware::FollowRedirects
      f.headers = @req_headers
      f.adapter :net_http
    end

    @resp = connection.get { |req| req.url('/api/v1/gate/ping') }
    raise @resp.reason_phrase unless @resp.success?

    @reactions = []
    @samples = []

    @collection = Collection.find(id)
    all_reaction_ids = CollectionsReaction.select(:reaction_id)
                                      .where(collection_id: id)
                                      .pluck(:reaction_id)

    reaction_sample_ids = Reaction.get_associated_samples(all_reaction_ids)

    all_sample_ids = CollectionsSample.select(:sample_id).where(collection_id: id)
                                    .pluck(:sample_id) - reaction_sample_ids


    return true if all_reaction_ids.nil? && all_sample_ids.nil?

    if (all_reaction_ids&.count > 0 || all_sample_ids&.count > 0)

      all_reaction_ids.each { |reaction_id|
        transfer_data({type: GateTransferJob::REACTION, id: reaction_id, state:GateTransferJob::STATE_BEFORE_TRANSFER, msg:'' })
      }

      all_sample_ids.each { |sample_id|
        transfer_data({type: GateTransferJob::SAMPLE, id: sample_id, state:GateTransferJob::STATE_BEFORE_TRANSFER, msg:'' })
      }

      if (@reactions.count > 0 || @samples.count > 0)
        MoveToCollectionJob.set(queue: "move_to_collection_#{id}")
                     .perform_later(id, @reactions, @samples)
      end
    end
    true
  end

  def transfer_data(element)
    begin
      sample_ids = [element[:id]] if element[:type] == GateTransferJob::SAMPLE
      reaction_ids = [element[:id]] if element[:type] == GateTransferJob::REACTION
      exp = Export::ExportJson.new(
        collection_id: @collection.id, sample_ids: sample_ids, reaction_ids: reaction_ids
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

      payload_connection = Faraday.new(url: @url) { |f|
        f.use FaradayMiddleware::FollowRedirects
        f.request :multipart
        f.headers = @req_headers.merge('Accept' => 'application/json')
        f.adapter :net_http
      }

      @resp = payload_connection.post { |req|
        req.url('/api/v1/gate/receiving')
        req.body = req_payload
      }

      if @resp.success?
        element[:state] = GateTransferJob::STATE_TRANSFERRED
      else
        Delayed::Worker.logger.error <<~TXT
          --------- gate transfer FAIL message.BEGIN ------------
          resp status:  #{@resp.status}
          #{element[:type]} - #{element[:id]}
          --------- gate transfer FAIL message.END ---------------
        TXT

        element[:state] = GateTransferJob::STATE_TRANSFER
        element[:msg] = 'resp is not successful'
      end
    rescue => e
      element[:state] = GateTransferJob::STATE_TRANSFER
      element[:msg] = e
    ensure
      @samples.push(element) if element[:type] == GateTransferJob::SAMPLE
      @reactions.push(element) if element[:type] == GateTransferJob::REACTION

      data_file.close unless data_file.nil?
      data_file.unlink unless data_file.nil?
      tmp_files.each do |tf|
        tf.close
        tf.unlink
      end
    end
  end

end
