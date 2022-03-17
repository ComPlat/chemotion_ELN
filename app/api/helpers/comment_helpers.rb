module CommentHelpers
  extend Grape::API::Helpers

  def authorized_users(collections)
    sync_collection_users = SyncCollectionsUser.includes(:user)
                                               .where('shared_by_id IN (?) AND collection_id IN (?)',
                                                      collections.pluck(:user_id), collections.ids)
    user_ids = []
    sync_collection_users.each do |sync_collection_user|
      if sync_collection_user.user.type.eql? 'Person'
        user_ids += [sync_collection_user.user_id]
      elsif sync_collection_user.user.type.eql? 'Group'
        user_ids += sync_collection_user.user.users.ids
      end
    end
    (collections.pluck(:user_id) + user_ids).compact.uniq
  end

  def create_message_notification(collections, current_user)
    message_to = collections.pluck(:user_id) - [current_user.id]
    return unless message_to.present?

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
      message_from: current_user.id, message_to: message_to,
      data_args: { commented_by: current_user.name, collection_name: collections.first.label },
      level: 'info'
    )
  end
end
