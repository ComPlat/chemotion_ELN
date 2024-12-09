class CollectDataFromMailJob < ApplicationJob
  queue_as :collect_data

  def perform
    collector = Datacollector::Mailcollector.new
    collector.execute
  end
end
