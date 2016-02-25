class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_count

  def samples_count
    object.samples.count
  end
end
