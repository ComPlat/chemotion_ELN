# frozen_string_literal: true

module CommentHelpers
  extend Grape::API::Helpers

  def authorized_users(collections)
    sync_collections = collections.synchronized
    shared_collections = collections.where(is_shared: true)
    sync_collection_users = SyncCollectionsUser.includes(:user)
                                               .where('shared_by_id IN (?) AND collection_id IN (?)',
                                                      sync_collections.pluck(:user_id), sync_collections.ids)
    user_ids = []
    sync_collection_users&.each do |sync_collection_user|
      user_ids = get_user_ids(sync_collection_user, user_ids)
    end

    shared_collections&.each do |collection|
      user_ids = get_user_ids(collection, user_ids)
    end
    (collections.unshared.pluck(:user_id) + user_ids).compact.uniq
  end

  def get_user_ids(obj, user_ids)
    case obj.user.type
    when 'Person'
      user_ids += [obj.user_id]
    when 'Group'
      user_ids += obj.user.users.ids
    end

    user_ids
  end

  def create_message_notification(collections, current_user)
    message_to =
      User.joins(:sync_in_collections_users)
          .persons
          .where('shared_by_id IN (?) AND collection_id IN (?)', collections.pluck(:user_id), collections.ids)
          .ids - [current_user.id]
    return if message_to.blank?

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
      message_from: current_user.id, message_to: message_to,
      data_args: { commented_by: current_user.name, collection_name: collections.first.label },
      level: 'info'
    )
  end
end
