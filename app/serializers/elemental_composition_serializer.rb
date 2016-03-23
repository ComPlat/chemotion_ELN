class ElementalCompositionSerializer < ActiveModel::Serializer
  attributes :id, :data, :loading, :description, :composition_type
  root false

  def description
    ElementalComposition::TYPES[object.composition_type.to_sym]
  end

  def data
    object.data.sort_by {|key, value| key}.to_h
  end
end
