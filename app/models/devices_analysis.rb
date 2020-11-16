class DevicesAnalysis < ApplicationRecord
  belongs_to :device
  has_many :analyses_experiments
end
