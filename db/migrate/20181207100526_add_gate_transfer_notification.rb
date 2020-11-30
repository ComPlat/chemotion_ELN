class AddGateTransferNotification < ActiveRecord::Migration[4.2]
  def change
    channel = Channel.find_by(subject: Channel::GATE_TRANSFER_NOTIFICATION)
    return unless channel.nil?
    attributes = {
      subject: Channel::GATE_TRANSFER_NOTIFICATION,
      channel_type: 8,
      msg_template: '{"data": "The data in chemotion.net are transferred to Repository!",
                      "action":"RefreshChemotionCollection"
                     }'
    }
    Channel.create(attributes)
  end
end
