# frozen_string_literal: true

module Entities
  class NotificationEntity < ApplicationEntity
    expose(
      :id,
      :is_ack,
      :message_id,
      :user_id,
    )

    expose_timestamps
  end
end
