class CollectionSerializer < ActiveModel::Serializer
  attributes :id, :label, :shared_to, :is_shared, :shared_by_id, :is_locked, :shared_by,
    :descendant_ids, :is_synchronized, :permission_level, :sample_detail_level,
    :wellplate_detail_level, :screen_detail_level, :reaction_detail_level, :is_remote

  has_many :children

  has_many :shared_users, :serializer => UserSimpleSerializer
  has_many :sync_collections_users
  has_many :collection_acls

  def sync_collections_users
    object.sync_collections_users.includes(:user, :sharer, :collection)
  end

  def collection_acls
    collection_acls = []
    object.collection_acls.each do |acl|
      collection_acl = acl.attributes
      collection_acl[:user] = UserSimpleSerializer.new(acl.user || User.new).serializable_hash.deep_symbolize_keys
      collection_acls.push(collection_acl)
    end
    collection_acls
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
    # if object.is_shared
    #   UserSimpleSerializer.new(object.user || User.new).serializable_hash.deep_symbolize_keys
    # end
  end

  def shared_by
    if object.is_shared
      UserSimpleSerializer.new(object.user || User.new).serializable_hash.deep_symbolize_keys
    end
  end

end
