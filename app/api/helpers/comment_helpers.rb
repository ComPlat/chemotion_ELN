# frozen_string_literal: true

module CommentHelpers
  extend Grape::API::Helpers

  def element_name(element)
    if element.respond_to?(:short_label)
      element&.short_label
    elsif element.respond_to?(:name)
      element.name
    else
      ''
    end
  end

  def notify_collection_owners(current_user, element)
    element.collections.find_each do |collection|
      recipient = collection.user.send(:user_ids) - [current_user.id]
      next if recipient.blank?

      data_args = {
        commented_by: current_user.name,
        element_type: element.class.to_s,
        element_name: element_name(element),
      }

      Message.create_msg_notification(
        channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
        message_from: current_user.id,
        message_to: recipient,
        data_args: data_args,
        level: 'info',
      )
    end
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
