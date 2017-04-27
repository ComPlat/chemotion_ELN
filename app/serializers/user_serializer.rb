class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :initials, :samples_count, :reactions_count, :type,
            :reaction_name_prefix, :layout

  # def selected_device_id
  #   object.selected_device.try(:id)
  # end

  def samples_count
    object.counters['samples'].to_i
  end

  def reactions_count
    object.counters['reactions'].to_i
  end
end
