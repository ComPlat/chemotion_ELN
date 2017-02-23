class DeviceSerializer < ActiveModel::Serializer
  attributes :id, :title, :code, :types, :user_id, :samples, :devices_analyses
  
  def samples
    object.devices_samples.map {|devices_sample|
      SampleSerializer.new(Sample.find(devices_sample.sample_id)).serializable_hash
    }
  end

  def devices_analyses
    object.devices_analyses.map{|analysis|
      DevicesAnalysisSerializer.new(DevicesAnalysis.find(analysis.id)).serializable_hash
    }
  end
end
