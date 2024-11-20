class SyncGoechemUpdatesChannel < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_or_create_by(subject: Channel::SYNC_GOECHEM_CHEMICALS_NOTIFICATION)
    attributes = {
      subject: Channel::SYNC_GOECHEM_CHEMICALS_NOTIFICATION,
      channel_type: 10,
      msg_template: JSON.parse('{"data": "%{message}", "action":"CollectionActions.fetchUnsharedCollectionRoots"}')
    }
    channel.update(attributes) if channel
  end
end
