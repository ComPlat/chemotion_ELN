class DeviceNovncSerializer < ActiveModel::Serializer
  attributes :id, :name, :novnc

  def novnc
    object.profile.data['novnc']
  end
end
