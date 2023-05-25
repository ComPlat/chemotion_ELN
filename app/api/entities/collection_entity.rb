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
      :wellplate_detail_level,
      :tabs_segment
    )

    expose :collection_acls, using: Entities::CollectionAclEntity
  end
end
