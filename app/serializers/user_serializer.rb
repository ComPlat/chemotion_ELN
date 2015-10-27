class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_created_count
end
