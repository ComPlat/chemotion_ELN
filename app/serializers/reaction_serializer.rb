class ReactionSerializer < ActiveModel::Serializer
  attributes :id, :type, :name, :created_at, :collection_labels

  has_many :starting_materials
  has_many :reactants
  has_many :products
  has_many :literatures

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    collections = object.collections
    collections.flat_map(&:label).zip(collections.flat_map(&:is_shared)).uniq
  end

  def type
    'reaction'
  end
end
