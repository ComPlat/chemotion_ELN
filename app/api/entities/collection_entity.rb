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
    )

    expose :children, using: 'Entities::CollectionEntity'
    expose :shared_to, using: 'Entities::UserSimpleEntity'
    expose :shared_users, using: 'Entities::UserSimpleEntity'
    expose :sync_collections_users, using: 'Entities::SyncCollectionsUserEntity'

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

    def shared_to
      return unless object.is_shared

      object.user || User.new
    end
  end
end
