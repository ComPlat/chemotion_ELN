class CollectFileFromLocalJob < ApplicationJob
  queue_as :collect_data
  
  def perform
    devices = Device.where(datacollector_method: 'filewatcherlocal')
    Datacollector::Collector.bulk_execute(devices)
  end
end
