class AnalysesExperiment < ActiveRecord::Base
  belongs_to :sample
  belongs_to :devices_analysis
end
