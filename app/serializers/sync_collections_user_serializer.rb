class SyncCollectionsUserSerializer < ActiveModel::Serializer
  attributes :id, :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level
  attributes :ancestry, :user, :sharer
  attributes :label, :is_shared, :is_locked, :is_sync_to_me

  def ancestry
    object.fake_ancestry
  end

  def user
    UserSimpleSerializer.new(object.user || User.new).serializable_hash.deep_symbolize_keys
  end

  def sharer
    UserSimpleSerializer.new(object.sharer || User.new).serializable_hash.deep_symbolize_keys
  end

  def label
    object.collection.label
  end

  def is_shared
    true
  end

  def is_locked
    false
  end

  def is_sync_to_me
    true
  end
end
