class SampleSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :created_at, :collection_labels, :amount_value, :amount_unit, :molecule_svg

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label)
  end

  def type
    'sample'
  end

  def molecule_svg
    ['168.svg','171.svg','361.svg'][id % 3]
  end

end
