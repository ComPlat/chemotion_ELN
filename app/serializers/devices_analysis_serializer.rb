class DevicesAnalysisSerializer < ActiveModel::Serializer
  attributes :id, :sample_id, :device_id, :analysis_type, :title, :experiments, :analysis_barcode
  
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

  def analysis_barcode
    sample = Sample.find(object.sample_id)
    case object.analysis_type
      when "NMR" then sample.analyses.select{|a| a['kind'] == "1H NMR"}.first['bar_code_bruker']
      else nil
    end
  end

  def experiments
    object.analyses_experiments.map {|a|
      AnalysesExperimentSerializer.new(AnalysesExperiment.find(a.id)).serializable_hash
    }
  end

end
