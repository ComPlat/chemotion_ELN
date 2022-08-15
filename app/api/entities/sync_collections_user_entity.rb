# frozen_string_literal: true

module Entities
  class SyncCollectionsUserEntity < ApplicationEntity
    expose(
      :ancestry,
      :element_detail_level,
      :id,
      :is_locked,
      :is_shared,
      :is_sync_to_me,
      :label,
      :permission_level,
      :reaction_detail_level,
      :sample_detail_level,
      :screen_detail_level,
      :wellplate_detail_level,
    )

    expose :sharer, using: 'Entities::UserSimpleEntity'
    expose :user, using: 'Entities::UserSimpleEntity'

    def ancestry
      object.fake_ancestry
    end

    def user
      object.user || User.new
    end

    def sharer
      object.sharer || User.new
    end

    def label
      object.collection.label
    end

    def is_shared
      true
    end

    def is_locked
      false
    end

    def is_sync_to_me
      true
    end
  end
end
