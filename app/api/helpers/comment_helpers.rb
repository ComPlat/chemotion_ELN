# frozen_string_literal: true

module CommentHelpers
  extend Grape::API::Helpers

  def authorized_users(collections)
    user_ids = collections.pluck(:user_id)
    shared_collections_user_ids = CollectionAcl.where(collection_id: collections.ids).pluck(:user_id)

    (user_ids + shared_collections_user_ids).compact.uniq
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

  def notify_users(collections, current_user, element)
    message_to = (collections.pluck(:user_id) - [current_user.id]).uniq
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

  def notify_acl_collection_users(collections, current_user, element)
    user_ids = CollectionAcl.where(collection: collections).pluck(:user_id)
    message_to = (user_ids - [current_user.id]).uniq

    return if message_to.blank?

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

  def create_message_notification(collections, current_user, element)
    notify_users(collections, current_user, element)
    notify_acl_collection_users(collections, current_user, element)
  end

  def notify_comment_resolved(comment, current_user)
    commentable_type = comment.commentable_type
    commentable = commentable_type.classify.constantize.find comment.commentable_id

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_RESOLVED,
      message_from: current_user.id, message_to: [comment.created_by],
      data_args: { resolved_by: current_user.name,
                   element_type: commentable_type,
                   element_name: element_name(commentable) },
      level: 'info'
    )
  end
end
