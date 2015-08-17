class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :descendant_ids

  has_many :children

  def children
    object.children
  end

  def descendant_ids
    object.descendant_ids
  end

end
