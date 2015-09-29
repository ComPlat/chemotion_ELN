class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :descendant_ids,
             :permission_level, :sample_detail_level, :reaction_detail_level, :wellplate_detail_level

  has_many :children

  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end
end
