class AddChemscannerNotification < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::CHEMSCANNER_NOTIFICATION)
    return unless channel.nil?

    data = '%{nameIdentifier}: %{successNo} %{element}s successfully imported, %{failedNo} %{element}s failed to import!'
    msg_template = '{"data": "' + data + '", "level": "info", "action":"ElementActions.refreshElements", "type": "reaction"}'

    attributes = {
      subject: Channel::CHEMSCANNER_NOTIFICATION,
      channel_type: 8,
      msg_template: msg_template
    }
    Channel.create(attributes)
  end
end
