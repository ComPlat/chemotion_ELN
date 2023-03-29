# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    expose(
      :descendant_ids,
      :id,
      :is_locked,
      :is_remote,
      :is_shared,
      :is_synchronized,
      :label,
      :permission_level,
      :reaction_detail_level,
      :sample_detail_level,
      :screen_detail_level,
      :shared_by_id,
      :wellplate_detail_level,
      :tabs_segment
    )

    expose :children, using: 'Entities::CollectionEntity'
    expose :collection_acls, anonymize_with: []
    expose :shared_by, using: 'Entities::UserSimpleEntity'
    expose :shared_users, using: 'Entities::UserSimpleEntity'

    private

    def sync_collections_users
      object.sync_collections_users.includes(:user, :sharer, :collection)
    end

    def children
      object.children.ordered
    end

    def is_remote
      object.is_shared &&
        (object.shared_by_id != current_user.id)
    end

    def descendant_ids
      object.descendant_ids
    end

    def shared_by
      # return unless object.is_shared

      object.user || User.new
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
