class DevicesAnalysis < ActiveRecord::Base
  belongs_to :device
  has_many :analyses_experiments
end
