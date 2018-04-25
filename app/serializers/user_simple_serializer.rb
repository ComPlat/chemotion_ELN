class UserSimpleSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :type
end
