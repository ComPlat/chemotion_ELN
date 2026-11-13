# frozen_string_literal: true

class MoveToCollectionJob < ApplicationJob
  queue_as :move_to_collection

  def max_attempts
    1
  end

  def perform(id, msg = nil)
    col = Collection.find(id)
    # is_locked goes in the block, not in the argument hash: that hash doubles as the lookup
    # criteria, so passing it there would miss the existing (pre-lock) row and create a second one.
    # The "transferred" node is system-managed like the "All" and repository roots it sits beside,
    # and locking it is what keeps a collection-tree update from moving it out of that subtree.
    tr_col = col.children.find_or_create_by(user_id: col.user_id, label: 'transferred') do |collection|
      collection.is_locked = true
    end
    move_col(col, tr_col)
    send_message(col.user_id, "operation completed. #{msg}", 'success')
  rescue StandardError => e
    Delayed::Worker.logger.error <<~TXT
      --------- gate move collection FAIL error message.BEGIN ------------
      message:  #{e.message}
      --------- gate move collection FAIL error message.END ---------------
    TXT
    # col is nil when Collection.find above is what raised; dereferencing it there would replace the
    # real error with a NoMethodError and, since max_attempts is 1, lose it entirely.
    send_message(col.user_id, e.message, 'error') if col
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
