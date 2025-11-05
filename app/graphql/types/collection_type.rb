# frozen_string_literal: true

module Types
  class CollectionType < Types::BaseObject
    field :label, String, null: false, description: 'Label of collection'
    field :permission_level, Int, description: 'Permission level'
    field :sample_detail_level, Int, description: 'Sample detail level'
    field :reaction_detail_level, Int, description: 'Reaction detail level'
    field :wellplate_detail_level, Int, description: 'Wellplate detail level'
    field :researchplan_detail_level, Int, description: 'Researchplan detail level'
    field :element_detail_level, Int, description: 'Element detail level'
    field :screen_detail_level, Int, description: 'Screen detail level'
    field :position, Int, description: 'Position'
    field :is_locked, Boolean, description: 'Collection is locked?'
  end
end
