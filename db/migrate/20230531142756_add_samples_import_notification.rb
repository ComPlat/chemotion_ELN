class AddSamplesImportNotification < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_or_create_by(subject: Channel::IMPORT_SAMPLES_NOTIFICATION)
    attributes = {
      subject: Channel::IMPORT_SAMPLES_NOTIFICATION,
      channel_type: 8,
      msg_template: JSON.parse('{"data": "%{message}", "action":"CollectionActions.fetchSyncInCollectionRoots"}')
    }
    channel.update(attributes) if channel
  end
end
