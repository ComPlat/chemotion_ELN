# frozen_string_literal: true

module Entities
  class SharedCollectionEntity < ApplicationEntity
    self.hash_access = :to_s

    expose! :id
    expose! :ancestry
    expose! :position
    expose! :label
    expose! :tabs_segment
    expose! :inventory_id
    expose! :inventory_name
    expose! :inventory_prefix
    expose! :owner
    expose! :is_locked
    expose! :permission_level
  end
end
