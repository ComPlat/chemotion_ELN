class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_count, :reactions_count

  def samples_count
    object.samples.count
  end

  def reactions_count
    object.reactions.count
  end
end
