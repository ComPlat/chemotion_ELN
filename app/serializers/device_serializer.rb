class DeviceSerializer < ActiveModel::Serializer
  attributes :id, :title, :code, :types, :user_id, :samples
  
  def samples
    object.devices_samples.map {|devices_sample|
      SampleSerializer.new(Sample.find(devices_sample.sample_id)).serializable_hash
    }
  end
end
