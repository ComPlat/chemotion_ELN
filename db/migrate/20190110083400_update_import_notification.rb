class UpdateImportNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_by(subject: Channel::SEND_IMPORT_NOTIFICATION)
    if channel
      channel.msg_template = '{"data": "%<data>"}'
      channel.save!
    else
      attributes = {
        subject: Channel::SEND_IMPORT_NOTIFICATION,
        channel_type: 8,
        msg_template: '{"data": "%<data>"}'
      }
      Channel.create(attributes)
    end
  end
end
