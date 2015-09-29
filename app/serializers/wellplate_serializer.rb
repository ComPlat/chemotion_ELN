class WellplateSerializer < ActiveModel::Serializer
  attributes :id, :type, :size, :name, :description, :created_at, :collection_labels, :wells

  has_many :wells

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    collections = object.collections
    collections.flat_map(&:label).zip(collections.flat_map(&:is_shared)).uniq
  end

  def type
    'wellplate'
  end
end
