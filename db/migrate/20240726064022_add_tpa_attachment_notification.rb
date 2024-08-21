class AddTpaAttachmentNotification < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_by(subject: Channel::SEND_TPA_ATTACHMENT_NOTIFICATION)
    return unless channel.nil?

    attributes = {
      subject: Channel::SEND_TPA_ATTACHMENT_NOTIFICATION,
      channel_type: 8,
      msg_template: JSON.parse('{"data": "Attachment from the third party app %{app} is available.",
                                "level": "info"
                                }
                              ')
    }
    Channel.create(attributes)
  end
end
