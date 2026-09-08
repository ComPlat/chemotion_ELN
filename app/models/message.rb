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
    # Integer(...) rather than to_i: any id that is not a clean integer raises here instead of
    # silently truncating into the query, so no caller-supplied value ever reaches the SQL text
    # unvalidated. sanitize_sql then does the actual quoting (repo convention, see OlsTerm).
    ids_literal = "{#{Array(receiver_ids).map { |id| Integer(id) }.join(',')}}"
    sql = sanitize_sql(
      ['select generate_notifications(?, ?, ?, ?::int[]) as message_id',
       Integer(channel_id), Integer(message_id), Integer(user_id), ids_literal],
    )
    ApplicationRecord.connection.exec_query(sql)
  end

  private_class_method :bulk_create_notifications
end
