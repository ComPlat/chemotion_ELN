class AddCollectionTakeOwnerShipSampleErrors < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::COLLECTION_TAKE_OWNERSHIP_FAIL_SAMPLE_IN_MULTIPLE_COLLECTIONS)
    if (channel.nil?)
      attributes = {
        subject: Channel::COLLECTION_TAKE_OWNERSHIP_FAIL_SAMPLE_IN_MULTIPLE_COLLECTIONS,
        channel_type: 8,
        msg_template: { data: "%{new_owner} cannot take ownership of the collection: %{collection_name}. Because samples: %{samples} belong to multiple collections",
        action: "CollectionActions.takeOwnership",
        level: "error"
        }
      }
      Channel.create(attributes)
    end
  end
end
