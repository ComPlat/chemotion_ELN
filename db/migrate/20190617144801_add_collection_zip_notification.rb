class AddCollectionZipNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
    if (channel.nil?)
      attributes = {
        subject: Channel::COLLECTION_ZIP,
        channel_type: 8,
        msg_template: '{"data": "Collection(s): %{col_labels} has been %{operate} successfully.",
                        "action":"CollectionActions.fetchUnsharedCollectionRoots"
                       }'
      }
      Channel.create(attributes)
    end
  end
end
