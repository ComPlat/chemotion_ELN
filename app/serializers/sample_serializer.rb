class SampleSerializer < ActiveModel::Serializer
  attributes :id, :name, :created_at, :collection_labels, :type

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label)
  end

  def type
    'sample'
  end
end
