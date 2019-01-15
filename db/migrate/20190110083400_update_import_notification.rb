class UpdateImportNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_by(subject: Channel::SEND_IMPORT_NOTIFICATION)
    if channel
      channel.msg_template = '{"data": "%<data>s"}'
      channel.save!
    else
      attributes = {
        subject: Channel::SEND_IMPORT_NOTIFICATION,
        channel_type: 8,
        msg_template: '{"data": "%<data>s"}'
      }
      Channel.create(attributes)
    end
  end
end
