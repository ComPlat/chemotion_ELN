# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class MoveToCollectionJob < ActiveJob::Base
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

      channel = Channel.find_by(subject: Channel::GATE_TRANSFER_NOTIFICATION)
      return true if channel&.msg_template.nil?

      error_samples = samples.select{ |o| o[:state] != MoveToCollectionJob::STATE_MOVED }
      error_reactions = reactions.select{ |o| o[:state] != MoveToCollectionJob::STATE_MOVED }

      raise "jobs are not completed!! " if error_samples&.count > 0 || error_reactions&.count > 0

    rescue => e
      Rails.logger.error moresamples if moresamples
      Rails.logger.error error_samples   if error_samples&.count > 0
      Rails.logger.error error_reactions if error_reactions&.count > 0
      raise "Jobs are not completed!! " + error_reactions&.to_json + error_samples&.to_json

    ensure
      content = channel.msg_template
      content['data'] = 'Still some samples are on the blanket, please sync. again.' if moresamples&.count > 0
      content['data'] = 'Some samples/reaction are not completed....' if error_samples&.count > 0 || error_reactions&.count > 0
      users = [collection.user_id]
      users.push(101) if moresamples&.count > 0 || error_samples&.count > 0 || error_reactions&.count > 0
      message = Message.create_msg_notification(channel.id,content,collection.user_id,users)
    end
    true
  end
end
