class SampleSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :description, :created_at, :collection_labels, :amount_value, :amount_unit, :molecule_svg

  has_one :molecule

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label).uniq
  end

  def type
    'sample'
  end

  def molecule_svg
    molecule.molecule_svg_file
  end

end
