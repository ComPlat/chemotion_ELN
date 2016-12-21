class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_count, :reactions_count, :type,
            :reaction_name_prefix, :layout

  def samples_count
    object.counters['samples'].to_i
  end

  def reactions_count
    object.counters['reactions'].to_i
  end
end
