class DeviceSerializer < ActiveModel::Serializer
  attributes :id, :title, :code, :types, :user_id, :samples, :devices_analyses
  
  def samples
    object.devices_samples.map {|devices_sample|
      sample = Sample.find(devices_sample.sample_id)
      {
        id: devices_sample.id,
        device_id: object.id,
        sample_id: sample.id,
        short_label: sample.short_label,
        types: devices_sample.types
      }
    }
  end

  def devices_analyses
    object.devices_analyses.map{|analysis|
      DevicesAnalysisSerializer.new(DevicesAnalysis.find(analysis.id)).serializable_hash
    }
  end
end
