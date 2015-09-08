class ReactionSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :created_at, :collection_labels

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label).uniq
  end

  def type
    'reaction'
  end

end
