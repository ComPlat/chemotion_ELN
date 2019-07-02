# Delayed messaging to notify a ELNer about new available data in INBOX
class MessageIncomingDataJob < ActiveJob::Base
  def perform(sender_name, from, to)
    Message.create_msg_notification(
      channel_subject: Channel::INBOX_ARRIVALS_TO_ME,
      data_args: { device_name: sender_name },
      message_from: from, message_to: [to]
    )
  end
end
