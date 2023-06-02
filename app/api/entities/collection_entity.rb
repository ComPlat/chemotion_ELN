# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    expose(
      :ancestry,
      :id,
      :is_locked,
      :is_shared,
      :label,
      :user_id,
      :position,
    )
  end
end
