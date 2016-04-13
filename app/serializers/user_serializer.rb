class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_count, :reactions_count

  def samples_count
    object.samples_created_count
  end

  def reactions_count
    object.counters['reactions'].to_i
  end
end
