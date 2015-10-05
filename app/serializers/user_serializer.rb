class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials

  def name
    object.name
  end

  def initials
    "#{object.first_name[0].capitalize}#{object.last_name[0].capitalize}"
  end
end
