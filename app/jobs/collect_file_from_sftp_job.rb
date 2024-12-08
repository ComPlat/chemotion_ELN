class CollectFileFromSftpJob < ApplicationJob
  queue_as :collect_data

  def perform
    devices = Device.where(datacollector_method: 'filewatchersftp')
    Datacollector::Collector.bulk_execute(devices)
  end
end
