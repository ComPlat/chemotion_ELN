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

  # Returns the in-app URL path for a given element so it can be embedded in
  # notifications as a clickable deep link.  The path matches the Aviator
  # client-side routes defined in routes.js (e.g. /mydb/sample/42).
  def element_url_path(element)
    type_slug = element.class.to_s.underscore
    "/mydb/#{type_slug}/#{element.id}"
  end

  def notify_collection_owners(current_user, element)
    recipients = collect_collection_recipients(element) - [current_user.id]
    return if recipients.blank?

    data_args = {
      commented_by: current_user.name,
      element_type: element.class.to_s,
      element_name: element_name(element),
    }

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_ON_MY_COLLECTION,
      message_from: current_user.id,
      message_to: recipients,
      data_args: data_args,
      level: 'info',
      url: element_url_path(element),
      urlTitle: "View #{element.class} #{element_name(element)}",
    )
  end

  # Collects all users with access to the element across its collections —
  # both the collection owners and anyone the collection is shared with —
  # expanding any group recipients to their member ids and de-duplicating.
  def collect_collection_recipients(element)
    ids = element.collections.includes(:user, collection_shares: :shared_with).flat_map do |collection|
      [
        *collection.user&.send(:user_ids),
        *collection.collection_shares.flat_map do |share|
          share.shared_with&.send(:user_ids)
        end,
      ]
    end
    ids.compact.uniq
  end

  def notify_comment_resolved(comment, current_user)
    commentable_type = comment.commentable_type
    commentable = commentable_type.classify.constantize.find comment.commentable_id

    Message.create_msg_notification(
      channel_subject: Channel::COMMENT_RESOLVED,
      message_from: current_user.id,
      message_to: [comment.created_by],
      data_args: { resolved_by: current_user.name,
                   element_type: commentable_type,
                   element_name: element_name(commentable) },
      level: 'info',
      url: element_url_path(commentable),
      urlTitle: "View #{commentable_type} #{element_name(commentable)}",
    )
  end
end
