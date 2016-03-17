class ElementalCompositionSerializer < ActiveModel::Serializer
  attributes :id, :data, :loading, :description
  root false

  def description
    ElementalComposition::TYPES[object.composition_type.to_sym]
  end
end
