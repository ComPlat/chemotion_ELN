# frozen_string_literal: true

module Entities
  class CommentEntity < ApplicationEntity
    expose :id
    expose :content
    expose :created_by
    expose :section
    expose :status
    expose :submitter
    expose :resolver_name
    expose :commentable_id, :commentable_type

    expose_timestamps
  end
end
