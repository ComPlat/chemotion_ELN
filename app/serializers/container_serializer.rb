class ContainerSerializer < ActiveModel::Serializer
  attributes :id, :name, :container_type, :descendant_ids

  has_many :children


  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end

end
