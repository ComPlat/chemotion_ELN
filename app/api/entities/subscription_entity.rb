# frozen_string_literal: true

module Entities
  class SubscriptionEntity < ApplicationEntity
    expose(
      :channel_id,
      :id,
      :user_id,
    )

    expose_timestamps
  end
end
