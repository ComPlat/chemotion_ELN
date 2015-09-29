class RemoteCollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :descendant_ids, :shared_by_name

  has_many :children

  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end

  def shared_by_name
    User.find(object.shared_by_id).name
  end
end
