class CollectionRemoteSerializer < ActiveModel::Serializer
  attributes :id, :label, :descendant_ids, :is_shared, :shared_by_id, :is_locked,
    :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level, :shared_by, :shared_to

  has_many :children

  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end

  def shared_by
    sharing_user = User.find_by(id: object.shared_by_id) || User.new
    UserSimpleSerializer.new(sharing_user).serializable_hash.deep_symbolize_keys
  end

  def shared_to
    if object.is_shared && object.user.is_a?(Group)
      UserSimpleSerializer.new(object.user).serializable_hash.deep_symbolize_keys
    end
  end
end
