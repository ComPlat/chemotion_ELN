module Entities
  class SharedUserEntity < Grape::Entity
    expose :id do |data|
      data['id']
    end
    expose :type do |data|
      data['type']
    end
    expose :name do |data|
      data['name']
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
    expose :permission_level do |obj|
        obj['permission_level']
    end
  end
end
