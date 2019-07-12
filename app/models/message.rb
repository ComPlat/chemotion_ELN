# frozen_string_literal: true

# Publish-Subscription Model
class Message < ActiveRecord::Base
  belongs_to :channel
  scope :where_content, ->(field, value) { where("content ->> ? = ?", field, value) }

  def self.create_msg_notification(**args)
    channel_id = args[:channel_id]
    user_id = args.delete(:message_from)
    user_ids = args.delete(:message_to) || [user_id]
    content =  args[:message_content].presence || Channel.build_message(args)
    channel_id ||= content&.fetch('channel_id', false)
    return unless channel_id
    message = Message.create(
      content: content.as_json,
      channel_id: channel_id,
      created_by: user_id
    )
    bulk_create_notifications(channel_id, message.id, user_id, user_ids) if message
    message
  end

  def self.bulk_create_notifications(channel_id, message_id, user_id, receiver_ids)
    receiver_ids = "ARRAY#{receiver_ids || []}::int[]"
    sql = "select generate_notifications(#{channel_id}, #{message_id},
           #{user_id}, #{receiver_ids}) as message_id"
    ActiveRecord::Base.connection.exec_query(sql)
  end

  private_class_method :bulk_create_notifications
end
