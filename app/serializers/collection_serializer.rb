class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :shared_to, :is_shared, :shared_by_id, :is_locked,
    :descendant_ids, :is_synchronized, :permission_level, :sample_detail_level,
    :wellplate_detail_level, :screen_detail_level, :reaction_detail_level, :is_remote

  has_many :children

  has_many :shared_users, :serializer => UserSimpleSerializer
  has_many :sync_collections_users

  def sync_collections_users
    object.sync_collections_users.includes(:user, :sharer, :collection)
  end

  def children
    object.children.ordered
  end

  def is_remote
    object.is_shared &&
      (scope && (object.shared_by_id != scope.current_user.id))
  end

  def descendant_ids
    object.descendant_ids
  end

  def shared_to
    if object.is_shared
      UserSimpleSerializer.new(object.user || User.new).serializable_hash.deep_symbolize_keys
    end
  end

end
