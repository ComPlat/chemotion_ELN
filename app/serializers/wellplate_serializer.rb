class WellplateSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :description, :created_at, :collection_labels, :amount_value, :amount_unit, :molfile, :purity, :solvent, :impurities, :location, :weight, :volume

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
