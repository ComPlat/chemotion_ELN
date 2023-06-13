# frozen_string_literal: true

class MoveToCollectionJob < ApplicationJob
  queue_as :move_to_collection

  def max_attempts
    1
  end

  def perform(id)
    col = Collection.find(id)
    tr_col = col.children.find_or_create_by(user_id: col.user_id, label: 'transferred')
    move_col(col, tr_col)
    send_message(col.user_id, 'operation completed', 'success')
  rescue StandardError => e
    Delayed::Worker.logger.error <<~TXT
      --------- gate move collection FAIL error message.BEGIN ------------
      message:  #{e.backtrace}
      --------- gate move collection FAIL error message.END ---------------
    TXT
    send_message(col.user_id, e.message, 'error')
  end

  def move_col(col, tr_col)
    col.reactions&.map { |r| CollectionsReaction.move_to_collection(r[:id], col.id, tr_col.id) }
    col.samples&.map { |s| CollectionsSample.move_to_collection(s[:id], col.id, tr_col.id) }
  end

  def send_message(user_id, message, level)
    Message.create_msg_notification(
      channel_subject: Channel::GATE_TRANSFER_NOTIFICATION,
      data_args: { comment: message },
      level: level,
      message_from: user_id,
    )
  end
end
