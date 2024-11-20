class FetchGoechemUpdatesChannel < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_or_create_by(subject: Channel::FETCH_GOECHEM_UPDATES_NOTIFICATION)
    attributes = {
      subject: Channel::FETCH_GOECHEM_UPDATES_NOTIFICATION,
      channel_type: 11,
      msg_template: JSON.parse('{"data": "%{message}", "action":"CollectionActions.fetchUnsharedCollectionRoots"}')
    }
    channel.update(attributes) if channel
  end
end
