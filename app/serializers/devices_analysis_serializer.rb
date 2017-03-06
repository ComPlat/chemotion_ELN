class DevicesAnalysisSerializer < ActiveModel::Serializer
  attributes :id, :device_id, :analysis_type, :title, :experiments
  
  def title
    device_title = Device.find(object.device_id).title
    if device_title.blank?
      device_title = object.device_id
    end
    "#{device_title}: #{object.analysis_type}"
  end

  def experiments
    object.analyses_experiments.map {|a|
      AnalysesExperimentSerializer.new(AnalysesExperiment.find(a.id)).serializable_hash
    }
  end

end
