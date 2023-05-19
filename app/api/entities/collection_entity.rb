# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    expose(
      :descendant_ids,
      :ancestry,
      :id,
      :is_locked,
      :is_shared,
      :label,
      :user_id,
      :wellplate_detail_level,
      :tabs_segment
    )

    expose :collection_acls, anonymize_with: []

    private

    def descendant_ids
      object&.descendant_ids
    end

    def collection_acls
      collection_acls = []
      object.collection_acls.each do |acl|
        collection_acl = acl.attributes
        collection_acl[:user] = Entities::UserEntity.represent acl.user
        collection_acls.push(collection_acl)
      end
      collection_acls
    end
  end
end
