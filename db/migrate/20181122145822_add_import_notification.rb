class AddImportNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_by(subject: Channel::SEND_IMPORT_NOTIFICATION)
    return unless channel.nil?

    data = 'Imported %<success>s reactions successfully, %<failed>s failed to import!'
    msg_template = '{"data": "' + data + '"}'

    attributes = {
      subject: Channel::SEND_IMPORT_NOTIFICATION,
      channel_type: 8,
      msg_template: msg_template
    }
    Channel.create(attributes)
  end
end
