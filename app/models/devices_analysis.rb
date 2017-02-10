class DevicesAnalysis < ActiveRecord::Base
  belongs_to :device
  belongs_to :sample
  has_many :analyses_experiments
end
