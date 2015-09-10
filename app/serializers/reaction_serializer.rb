class ReactionSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :created_at, :collection_labels

  has_many :starting_materials
  has_many :reactants
  has_many :products

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
