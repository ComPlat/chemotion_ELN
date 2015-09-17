class WellplateSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :description, :position, :created_at, :collection_labels,

  #wrap position_x and y to position object

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label).uniq
  end

  def type
    'wellplate'
  end

end
