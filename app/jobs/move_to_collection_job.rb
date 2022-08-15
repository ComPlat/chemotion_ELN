class MoveToCollectionJob < ApplicationJob
  # queue_as :move_to_collection

  STATE_MOVING = 'moving'
  STATE_MOVED = 'moved'

  def max_attempts
    1
  end

  def perform(id)
    collection = Collection.find(id)

    tr_col = collection.children.find_or_create_by(
      user_id: collection.user_id, label: 'transferred'
    )

    reactions = collection.reactions
    samples = collection.samples

    begin
      reactions&.map do |reaction|
        begin
          CollectionsReaction.move_to_collection(
            reaction[:id], collection.id, tr_col.id
          )
        rescue StandardError => e
          Rails.logger.error e
        end
      end

      samples&.map do |sample|
        begin
          CollectionsSample.move_to_collection(
            sample[:id], collection.id, tr_col.id
          )
        rescue StandardError => e
          Rails.logger.error e
        end
      end
    ensure
      Message.create_msg_notification(
        channel_subject: Channel::GATE_TRANSFER_NOTIFICATION,
        data_args: { comment: 'operation completed' },
        message_from: collection.user_id
      )
    end
    true
  end
end
