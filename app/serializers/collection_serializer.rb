class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label

  has_many :children

  def children
    object.children
  end

end
