class CollectDataFromMailJob < ActiveJob::Base
  queue_as :collect_data
  
  def perform
    collector = Mailcollector.new
    collector.execute
  end
end
