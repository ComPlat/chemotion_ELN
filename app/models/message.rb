# frozen_string_literal: true

# Publish-Subscription Model
class Message < ActiveRecord::Base
  belongs_to :channel

  def self.create_msg_notification(channel_id, p_content, user_id, p_user_ids)
    channel = Channel.find(channel_id)
    return if channel.nil?
    msg_attr = {
      content: p_content.as_json,
      channel_id: channel.id,
      created_by: user_id
    }
    message = Message.create(msg_attr)
    bulk_create_notifications(channel.id, message.id, user_id, p_user_ids) unless message.nil?
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
