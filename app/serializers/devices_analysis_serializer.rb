class DevicesAnalysisSerializer < ActiveModel::Serializer
  attributes :id, :sample_id, :device_id, :analysis_type, :title, :experiments
  
  def title
    device_title = Device.find(object.device_id).title
    sample_title = Sample.find(object.sample_id).name
    if device_title.blank?
      device_title = object.device_id
    end
    if sample_title.blank?
      sample_title = object.sample_id
    end
    "#{device_title}-#{sample_title}"
  end

  def experiments
    object.analyses_experiments.map {|a|
      AnalysesExperimentSerializer.new(AnalysesExperiment.find(a.id)).serializable_hash
    }
  end

end
