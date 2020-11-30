class CreatePubSubscriptions < ActiveRecord::Migration[4.2]
  def change
    create_table :channels do |t|
      t.string :subject
      t.jsonb :msg_template
      t.integer :channel_type, default: 0
      t.timestamps null: false
    end

    create_table :subscriptions do |t|
      t.integer :channel_id
      t.integer :user_id
      t.timestamps null: false
    end

    create_table :messages do |t|
      t.integer :channel_id
      t.jsonb :content , null: false
      t.integer :created_by, null: false
      t.timestamps null: false
    end

    create_table :notifications do |t|
      t.integer :message_id
      t.integer :user_id
      t.integer :is_ack, default: 0
      t.timestamps null: false
    end

    add_index :subscriptions, [:channel_id, :user_id], unique: true
    add_index :notifications, [:message_id, :user_id], unique: true

    channel = Channel.find_by(subject: Channel::SYSTEM_UPGRADE)
    if (channel.nil?)
      attributes = {
        subject: Channel::SYSTEM_UPGRADE,
        channel_type: 9
      }
      Channel.create(attributes)
    end

    channel = Channel.find_by(subject: Channel::SYSTEM_NOTIFICATION)
    if (channel.nil?)
      attributes = {
        subject: Channel::SYSTEM_NOTIFICATION,
        channel_type: 9
      }
      Channel.create(attributes)
    end

    channel = Channel.find_by(subject: Channel::SYSTEM_MAINTENANCE)
    if (channel.nil?)
      attributes = {
        subject: Channel::SYSTEM_MAINTENANCE,
        channel_type: 9
      }
      Channel.create(attributes)
    end

    channel = Channel.find_by(subject: Channel::SHARED_COLLECTION_WITH_ME)
    if (channel.nil?)
      attributes = {
        subject: Channel::SHARED_COLLECTION_WITH_ME,
        channel_type: 8,
        msg_template: '{"data": "%{shared_by} has shared a collection with you.",
                        "action":"CollectionActions.fetchRemoteCollectionRoots"
                       }'
      }
      Channel.create(attributes)
    end

    channel = Channel.find_by(subject: Channel::SYNCHRONIZED_COLLECTION_WITH_ME)
    if (channel.nil?)
      attributes = {
        subject: Channel::SYNCHRONIZED_COLLECTION_WITH_ME,
        channel_type: 8,
        msg_template: '{"data": "%{synchronized_by} has synchronized a collection: %{collection_name} with you.",
                        "action":"CollectionActions.fetchSyncInCollectionRoots"
                       }'
      }
      Channel.create(attributes)
    end
  end
end
