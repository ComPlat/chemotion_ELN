# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class MoveToCollectionJob < ApplicationJob
  # queue_as :move_to_collection

  STATE_MOVING = 'moving'
  STATE_MOVED = 'moved'

  def perform(id, reactions, samples)
    collection = Collection.find(id)

    tr_col = collection.children.find_or_create_by(
      user_id: collection.user_id, label: 'transferred'
    )

    begin
      reactions&.map do |reaction|
        next unless reaction[:state] == GateTransferJob::STATE_TRANSFERRED
        begin
          reaction[:state] = MoveToCollectionJob::STATE_MOVING
          CollectionsReaction.move_to_collection(
            reaction[:id], collection.id, tr_col.id
          )
          reaction[:state] = MoveToCollectionJob::STATE_MOVED
        rescue StandardError => e
          Rails.logger.error e
          reaction[:msg] = e
        end
      end

      samples&.map do |sample|
        next unless sample[:state] == GateTransferJob::STATE_TRANSFERRED
        begin
          sample[:state] = MoveToCollectionJob::STATE_MOVING
          CollectionsSample.move_to_collection(
            sample[:id], collection.id, tr_col.id
          )
          sample[:state] = MoveToCollectionJob::STATE_MOVED
        rescue => e
          Rails.logger.error e
          sample[:msg] = e
        end
      end

      moresamples = CollectionsSample.select(:sample_id).where(collection_id: id)
                                    .limit(1).pluck(:sample_id)

      error_samples = samples.select{ |o| o[:state] != MoveToCollectionJob::STATE_MOVED }
      error_reactions = reactions.select{ |o| o[:state] != MoveToCollectionJob::STATE_MOVED }

      if error_samples&.count > 0 || error_reactions&.count > 0
        raise "Jobs are not completed!! "+ moresamples.inspect + error_reactions&.to_json + error_samples&.to_json
      end
    ensure
      comment =  'operation completed'
      comment =  'Some samples were not transferred, please sync. again.' if moresamples&.count > 0
      comment = 'Some samples/reaction could not be transferred....' if error_samples&.count > 0 || error_reactions&.count > 0

      Message.create_msg_notification(
        channel_subject: Channel::GATE_TRANSFER_NOTIFICATION,
        data_args: { comment: comment },
        message_from: collection.user_id,
      )
    end
    true
  end
end
