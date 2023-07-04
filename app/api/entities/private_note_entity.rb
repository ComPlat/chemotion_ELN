# frozen_string_literal: true

module Entities

  # Publish-Subscription Entities
  class PrivateNoteEntity < ApplicationEntity
    expose :id
    expose :content
    expose :created_by
    expose :noteable_id, :noteable_type

    expose_timestamps
  end
end
