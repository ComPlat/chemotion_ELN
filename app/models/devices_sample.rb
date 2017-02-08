class DevicesSample < ActiveRecord::Base
  belongs_to :device
  belongs_to :sample
  validates_uniqueness_of :sample_id, scope: [:device_id]
end
