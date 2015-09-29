class SampleSerializer < ActiveModel::Serializer
  attributes :id, :type, :name, :description, :created_at, :collection_labels, :amount_value, :amount_unit, :molfile,
             :purity, :solvent, :impurities, :location, :weight, :volume, :is_top_secret, :is_scoped

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

  def weight
    object.weight
  end

  def volume
    object.volume
  end

  def is_scoped
    false
  end
end
