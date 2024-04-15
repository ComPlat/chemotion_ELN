# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class ChannelEntity < ApplicationEntity
    expose :id, :subject, :channel_type
    expose :msg_template, if: ->(obj, _opts) { obj.respond_to? :msg_template }
    expose :user_id, if: ->(obj, _opts) { obj.respond_to? :user_id }

    expose_timestamps
  end
end
