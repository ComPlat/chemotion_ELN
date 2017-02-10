class AnalysesExperimentSerializer < ActiveModel::Serializer
  attributes :id, :devices_analysis_id, :on_day, :holder_id, :status, :solvent, :experiment, :checkbox, :number_of_scans, :numeric, :time  
end
