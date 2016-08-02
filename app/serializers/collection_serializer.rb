class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :descendant_ids, :is_shared, :shared_by_id, :is_locked,
    :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level, :shared_to

  has_many :children

  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end

  def shared_to
    if object.is_shared 
      UserSerializer.new(object.user).serializable_hash.deep_symbolize_keys
    end
  end

end
