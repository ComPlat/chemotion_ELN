class CollectDataFromLocalJob < ApplicationJob
  queue_as :collect_data

  def perform
    devices = Device.where(datacollector_method: 'folderwatcherlocal')
    Datacollector::Collectors.bulk_execute(devices)
  end
end
