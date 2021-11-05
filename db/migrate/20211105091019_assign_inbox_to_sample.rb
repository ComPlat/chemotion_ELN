class AssignInboxToSample < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::ASSIGN_INBOX_TO_SAMPLE)
    if (channel.nil?)
      attributes = {
        subject: Channel::ASSIGN_INBOX_TO_SAMPLE,
        channel_type: 8,
        msg_template: {"data": "This file [%{filename}] has been moved to the sample[%{info}] successfully."}
      }
      Channel.create(attributes)
    end
  end
end
