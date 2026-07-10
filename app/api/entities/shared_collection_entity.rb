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
    # nil when access is purely group-derived — there is no share of the user's own to reject
    expose! :collection_share_id
    expose! :shared_via_group
  end
end
