class SampleSerializer < ActiveModel::Serializer
  attributes :id, :name, :collection_labels

  def collection_labels
    object.collections.flat_map(&:label)
  end
end
