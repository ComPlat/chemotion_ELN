class UpdateCommentChannel < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_by(subject: Channel::COMMENT_ON_MY_COLLECTION)

    attributes = {
      msg_template:
        JSON.parse('{"data": "%<commented_by>s has made a new comment on %<element_type>s, %<element_name>s",
                                          "action":"CollectionActions.fetchSyncInCollectionRoots"}'),
    }

    channel.update(attributes) if channel

    channel = Channel.find_by(subject: Channel::COMMENT_RESOLVED)
    attributes = {
      msg_template: JSON.parse('{
        "data": "%<resolved_by>s has marked your comment as resolved on %<element_type>s, %<element_name>s",
        "action": "CollectionActions.fetchSyncInCollectionRoots"
       }'),
    }

    channel.update(attributes) if channel
  end
end
