# frozen_string_literal: true

module Entities
  class NotificationEntity
    expose(
      :id,
      :is_ack,
      :message_id,
      :user_id,
    )

    expose_timestamps
  end
end
