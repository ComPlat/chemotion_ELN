# frozen_string_literal: true

# == Schema Information
#
# Table name: messages
#
#  id         :integer          not null, primary key
#  channel_id :integer
#  content    :jsonb            not null
#  created_by :integer          not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

# Publish-Subscription Model
class Message < ApplicationRecord
  belongs_to :channel
  scope :where_content, ->(field, value) { where('content ->> ? = ?', field, value) }

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
      created_by: user_id,
    )
    bulk_create_notifications(channel_id, message.id, user_id, user_ids) if message
    message
  end

  def self.bulk_create_notifications(channel_id, message_id, user_id, receiver_ids)
    channel_id = normalize_integer(channel_id)
    message_id = normalize_integer(message_id)
    user_id = normalize_integer(user_id)
    return if [channel_id, message_id, user_id].any?(&:nil?)

    filtered_ids = normalize_integer_array(receiver_ids)
    return if filtered_ids.empty?

    receiver_ids_str = filtered_ids.join(',')
    sql = "select generate_notifications(#{channel_id}, #{message_id},
           #{user_id}, ARRAY[#{receiver_ids_str}]::int[]) as message_id"
    ApplicationRecord.connection.exec_query(sql)
  end

  def self.normalize_integer(value)
    Integer(value)
  rescue ArgumentError, TypeError
    nil
  end

  def self.normalize_integer_array(values)
    Array(values).filter_map { |value| normalize_integer(value) }.uniq
  end

  private_class_method :bulk_create_notifications
  private_class_method :normalize_integer
  private_class_method :normalize_integer_array
end
