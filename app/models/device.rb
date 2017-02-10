class Device < ActiveRecord::Base
  has_many :devices_samples
  has_many :devices_analyses
  belongs_to :user
end
