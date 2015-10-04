class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials

  def name
    "#{object.first_name} #{object.last_name}"
  end

  def initials
    "#{object.first_name[0].capitalize}#{object.last_name[0].capitalize}"
  end
end
