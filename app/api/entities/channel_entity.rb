# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class ChannelEntity < Grape::Entity
    expose :id, :subject, :channel_type
    expose :created_at, :updated_at
    expose :msg_template, if: ->(obj, _opts) { obj.respond_to? :msg_template }
    expose :user_id, if: ->(obj, _opts) { obj.respond_to? :user_id }

    def created_at
      object.created_at.strftime('%d.%m.%Y, %H:%M')
    end

    def updated_at
      object.updated_at.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
