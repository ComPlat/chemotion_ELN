class SampleSerializer < ActiveModel::Serializer
  attributes :id, :type, :name, :description, :created_at, :collection_labels, :amount_value, :amount_unit, :molfile,
             :purity, :solvent, :impurities, :location, :is_top_secret, :is_restricted, :external_label

  has_one :molecule

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    collections = object.collections
    collections.flat_map(&:label).zip(collections.flat_map(&:is_shared)).uniq
  end

  def type
    'sample'
  end

  def molecule_svg
    molecule.molecule_svg_file
  end

  def is_restricted
    false
  end
end
