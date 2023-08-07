class AddCommentChannel < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::COMMENT_ON_MY_COLLECTION)
    if channel.nil?
      attributes = {
        subject: Channel::COMMENT_ON_MY_COLLECTION,
        channel_type: 8,
        msg_template: JSON.parse('{"data": "%{commented_by} has commented on a collection: %{collection_name}.",
                                          "action":"CollectionActions.fetchSyncInCollectionRoots"}')
      }

      Channel.create(attributes)
    end

    channel = Channel.find_by(subject: Channel::COMMENT_RESOLVED)
    if channel.nil?
      attributes = {
        subject: Channel::COMMENT_RESOLVED,
        channel_type: 8,
        msg_template: JSON.parse('{"data": "%{resolved_by} has marked your comment as resolved.",
                                          "action":"CollectionActions.fetchSyncInCollectionRoots"}')
      }

      Channel.create(attributes)
    end
  end
end
