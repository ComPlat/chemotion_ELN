class CollectionTakeOwnership < ActiveRecord::Migration[4.2]
  def change
    channel = Channel.find_by(subject: Channel::COLLECTION_TAKE_OWNERSHIP)
    if (channel.nil?)
      attributes = {
        subject: Channel::COLLECTION_TAKE_OWNERSHIP,
        channel_type: 8,
        msg_template: '{"data": "%{new_owner} has take ownership of collection: %{collection_name}.",
                        "action":"CollectionActions.fetchUnsharedCollectionRoots"
                       }'
      }
      Channel.create(attributes)
    end
  end
end
