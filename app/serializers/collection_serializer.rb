class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :type

  has_many :children

  def children
    object.children
  end

  def type
    'collection'
  end
end
