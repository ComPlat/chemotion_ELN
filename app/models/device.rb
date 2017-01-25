class Device < ActiveRecord::Base
  has_many :devices_samples
end
