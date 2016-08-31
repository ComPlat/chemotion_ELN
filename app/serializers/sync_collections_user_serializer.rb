class SyncCollectionsUserSerializer < ActiveModel::Serializer
  attributes :id, :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level
  attributes :ancestry, :user, :sharer
  attributes :label, :is_shared, :is_locked

  def ancestry
    object.fake_ancestry
  end

  def user
    UserSerializer.new(object.user).serializable_hash.deep_symbolize_keys
  end

  def sharer
    UserSerializer.new(object.sharer).serializable_hash.deep_symbolize_keys
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



end
