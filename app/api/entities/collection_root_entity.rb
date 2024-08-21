module Entities
  class CollectionRootEntity < Grape::Entity
    expose(:inventory_id) { |obj| obj['inventory_id'] }
    expose(:inventory_prefix) { |obj| obj['inventory_prefix'] }
    expose(:inventory_name) { |obj| obj['inventory_name'] }

    expose :id do |obj|
        obj['id']
    end
    expose :label do |obj|
        obj['label']
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
    expose :element_detail_level do |obj|
        obj['element_detail_level']
    end
    expose :sync_collections_users do |obj|
        Entities::SharedUserEntity.represent obj['shared_names']
    end
    expose :is_locked do |obj|
        obj['is_locked']
    end
    expose :is_shared do |obj|
        obj['is_shared']
    end
    expose :is_remoted do |obj|
        obj['is_remoted']
    end
    expose :is_synchronized do |obj|
        obj['is_synchronized']
    end
    expose :shared_to do |obj|
        obj['shared_to']
    end
    expose :shared_by do |obj|
        obj['shared_by']
    end
    expose :tabs_segment do |obj|
      obj['tabs_segment']
    end
    expose :ancestry do |obj|
      obj['ancestry']
    end
    expose :children, as: 'children', using: 'Entities::CollectionRootEntity'
  end
end
