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

  def element_name(element)
    if element.respond_to?(:short_label)
      element&.short_label
    elsif element.respond_to?(:name)
      element.name
    else
      ''
    end
  end

  def notify_synchronized_collection_users(collections, current_user, element)
    sync_collections = collections.synchronized
    sync_collection_users = SyncCollectionsUser.includes(:user)
                                               .where(shared_by_id: sync_collections.pluck(:user_id),
                                                      collection_id: sync_collections.ids)

    message_to = sync_collection_users&.flat_map do |sync_collection_user|
      sync_collection_user.user&.send(:user_ids)
    end

    message_to = (message_to + collections.unshared.pluck(:user_id) - [current_user.id]).uniq
    return if message_to.blank?

    data_args = {
      commented_by: current_user.name,
      element_type: element.class.to_s,
      element_name: element_name(element),
    }

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
      message_from: current_user.id,
      message_to: message_to,
      data_args: data_args,
      level: 'info',
    )
  end

  def notify_shared_collection_users(shared_collections, current_user, element)
    shared_collections&.each do |collection|
      message_to = collection.user.send(:user_ids) - [current_user.id]
      next if message_to.blank?

      data_args = {
        commented_by: current_user.name,
        element_type: element.class.to_s,
        element_name: element_name(element),
      }

      Message.create_msg_notification(
        channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
        message_from: current_user.id,
        message_to: collection.user.send(:user_ids) - [current_user.id],
        data_args: data_args,
        level: 'info',
      )
    end
  end

  def create_message_notification(collections, current_user, element)
    notify_synchronized_collection_users(collections, current_user, element)
    notify_shared_collection_users(collections.where(is_shared: true), current_user, element)
  end
end
