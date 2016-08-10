class SyncCollectionsUserSerializer < ActiveModel::Serializer
  attributes :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level
  attributes :ancestry, :user, :sharer

  def ancestry
    object.fake_ancestry
  end

  def user
    UserSerializer.new(object.user).serializable_hash.deep_symbolize_keys
  end

  def sharer
    UserSerializer.new(object.sharer).serializable_hash.deep_symbolize_keys
  end

end
