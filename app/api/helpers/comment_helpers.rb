# frozen_string_literal: true

module CommentHelpers
  extend Grape::API::Helpers

  def authorized_users(collections)
    sync_collections = collections.synchronized
    shared_collections = collections.where(is_shared: true)

    sync_collection_users = SyncCollectionsUser.includes(:user)
                                               .where(shared_by_id: sync_collections.pluck(:user_id),
                                                      collection_id: sync_collections.ids)
    user_ids = sync_collection_users&.flat_map do |sync_collection_user|
      sync_collection_user.user&.send(:user_ids)
    end

    shared_collections&.flat_map do |collection|
      user_ids += collection.user&.send(:user_ids)
    end

    (collections.unshared.pluck(:user_id) + user_ids).compact.uniq
  end

  def notify_synchronized_collection_users(sync_collections, current_user)
    sync_collection_users = SyncCollectionsUser.includes(:user)
                                               .where(shared_by_id: sync_collections.pluck(:user_id),
                                                      collection_id: sync_collections.ids)
    sync_collection_users&.each do |sync_collection_user|
      message_to = sync_collection_user.user.send(:user_ids) - [current_user.id]
      next if message_to.blank?

      Message.create_msg_notification(
        channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
        message_from: current_user.id,
        message_to: sync_collection_user.user.send(:user_ids) - [current_user.id],
        data_args: { commented_by: current_user.name, collection_name: sync_collections.first.label },
        level: 'info',
      )
    end
  end

  def notify_shared_collection_users(shared_collections, current_user)
    shared_collections&.each do |collection|
      message_to = collection.user.send(:user_ids) - [current_user.id]
      next if message_to.blank?

      Message.create_msg_notification(
        channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
        message_from: current_user.id,
        message_to: collection.user.send(:user_ids) - [current_user.id],
        data_args: { commented_by: current_user.name, collection_name: collection.label },
        level: 'info',
      )
    end
  end

  def create_message_notification(collections, current_user)
    notify_synchronized_collection_users(collections.where(is_synchronized: true), current_user)
    notify_shared_collection_users(collections.where(is_shared: true), current_user)
  end
end
