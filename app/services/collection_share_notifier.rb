# frozen_string_literal: true

# Notifies one or more sharees, on the "Shared Collection With Me" channel, that something
# changed server-side on a collection shared with them — the subject NoticeButton.js
# already treats as a signal to refetch the sharee's collection tree. Shared between
# CollectionShareAPI (a Grape endpoint) and UpdateTree (a plain usecase), which is why this
# doesn't live in either's own helper module.
class CollectionShareNotifier
  def initialize(actor)
    @actor = actor
  end

  # @param user_ids [Array<Integer>, Integer] recipient id(s) — Person and/or Group; the
  #   notification pipeline resolves a Group to its members on its own
  # @param silent [Boolean] true suppresses the recipient's toast popup (it is still
  #   delivered and visible in their inbox, just auto-acknowledged — see NoticeButton.js's
  #   use of +content.silent+ and MessageAPI's list endpoint)
  def notify!(user_ids, text, silent: false)
    user_ids = Array(user_ids)
    return if user_ids.blank?

    channel_id = Channel.find_by(subject: Channel::SHARED_COLLECTION_WITH_ME)&.id
    return unless channel_id

    Message.create_msg_notification(
      channel_id: channel_id,
      message_content: { data: text, silent: silent },
      message_from: @actor.id,
      message_to: user_ids,
    )
  end
end
