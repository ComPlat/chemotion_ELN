class CollectFileFromLocalJob < ApplicationJob
  queue_as :collect_data
  
  def perform
    collector = Filecollector.new
    collector.execute(false)
  end
end
