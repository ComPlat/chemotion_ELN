class AddCollectionZipNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_or_create_by(subject: Channel::COLLECTION_ZIP)
    attributes = {
      subject: Channel::COLLECTION_ZIP,
      channel_type: 8,
      msg_template: '{"data": "Collection %{operation}: %{col_labels} processed successfully.",
                      "action":"CollectionActions.fetchUnsharedCollectionRoots",
                      "level": "success"
                     }'
    }
    channel.update(attributes) if channel

    channel = Channel.find_or_create_by(subject: Channel::COLLECTION_ZIP_FAIL)
    attributes = {
      subject: Channel::COLLECTION_ZIP_FAIL,
      channel_type: 8,
      msg_template: '{"data": "Collection %{operation}: There was an issue while processing %{col_labels}.",
                      "action":"CollectionActions.fetchUnsharedCollectionRoots",
                      "level": "error"
                     }'
    }
    channel.update(attributes) if channel
  end
end
