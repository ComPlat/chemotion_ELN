# Delayed messaging to notify a ELNer about new available data in INBOX
class MessageIncomingDataJob < ApplicationJob
  def perform(sender_name, from, to)
    Message.create_msg_notification(
      channel_subject: Channel::INBOX_ARRIVALS_TO_ME,
      data_args: { device_name: sender_name },
      message_from: correspondent(from),
      message_to: [correspondent(to)],
    )
  end

  private

  # Find a user id for the message
  # since Message only accepts user id as sender and receiver but
  # here the sender is likely to be a Device.
  # If it is a User, return the ID
  # If it is a Device, return the ID of the first group it belongs to
  # or the ID of the first Admin if it does not belong to any group
  # If it is an Integer, return the Integer.
  # @param arg [User, Device, Integer]
  # @return [Integer]
  def correspondent(arg)
    case arg
    when User
      arg.id
    when Device
      arg.groups.any? ? arg.groups.first.id : Admin.first.id
    when Integer
      arg
    else
      raise ArgumentError, "Invalid argument type: #{arg.class}"
    end
  end
end
