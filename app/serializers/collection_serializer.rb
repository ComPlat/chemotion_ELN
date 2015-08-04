class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label

  has_many :children
  has_many :samples

  def children
    object.children
  end
end
