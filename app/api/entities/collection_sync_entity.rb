module Entities
  class CollectionSyncEntity < Grape::Entity
    expose :id do |obj|
        obj['id']
    end
    expose :label do |obj|
        obj['label']
    end
    expose :shared_by_id do |obj|
        obj['shared_by_id']
    end
    expose :ancestry do |obj|
        obj['ancestry']
    end
    expose :is_locked do |obj|
        obj['is_locked']
    end
    expose :permission_level do |obj|
        obj['permission_level']
    end
    expose :reaction_detail_level do |obj|
        obj['reaction_detail_level']
    end
    expose :sample_detail_level do |obj|
        obj['sample_detail_level']
    end
    expose :screen_detail_level do |obj|
        obj['screen_detail_level']
    end
    expose :wellplate_detail_level do |obj|
        obj['wellplate_detail_level']
    end
    expose :shared_to do |obj|
        obj['shared_to']
    end
    expose :shared_by do |obj|
        obj['shared_by']
    end
    expose :user do |obj|
        obj['temp_user']
    end
    expose :sharer do |obj|
        obj['temp_sharer']
    end
    expose :children, as: 'children', using: Entities::CollectionSyncEntity
  end
end
