# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class MessageEntity < Grape::Entity
    expose :id, :message_id
    expose :subject, :content, :channel_type
    expose :sender_id, :sender_name, :receiver_id, :is_ack
    expose :created_at, :updated_at

    def created_at
      object.created_at.strftime('%d.%m.%Y, %H:%M')
    end

    def updated_at
      object.updated_at.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
