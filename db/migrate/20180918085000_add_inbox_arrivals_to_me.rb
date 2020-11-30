class AddInboxArrivalsToMe < ActiveRecord::Migration[4.2]
  def change
    channel = Channel.find_by(subject: Channel::INBOX_ARRIVALS_TO_ME)
    if (channel.nil?)
      attributes = {
        subject: Channel::INBOX_ARRIVALS_TO_ME,
        channel_type: 8,
        msg_template: '{"data": "%{device_name}: new files have arrived.",
                        "action":"InboxActions.fetchInbox"
                       }'
      }
      Channel.create(attributes)
    end

  end
end
