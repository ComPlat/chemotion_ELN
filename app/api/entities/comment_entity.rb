# frozen_string_literal: true

module Entities
  class CommentEntity < Grape::Entity
    expose :id
    expose :content
    expose :created_by
    expose :section
    expose :status
    expose :submitter
    expose :resolver_name
    expose :created_at, :updated_at
    expose :commentable_id, :commentable_type
  end
end
