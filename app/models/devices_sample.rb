class DevicesSample < ActiveRecord::Base
  belongs_to :device
  belongs_to :sample
end
