class AnalysesExperimentSerializer < ActiveModel::Serializer
  attributes :id, :devices_analysis_id, :on_day, :holder_id, :status, :solvent, :experiment, :priority, :number_of_scans, :sweep_width, :time  
end
