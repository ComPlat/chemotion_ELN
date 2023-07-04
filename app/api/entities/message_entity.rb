# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class MessageEntity < ApplicationEntity
    expose :id, :message_id
    expose :subject, :content, :channel_type
    expose :sender_id, :sender_name, :receiver_id, :is_ack

    expose_timestamps
  end
end
