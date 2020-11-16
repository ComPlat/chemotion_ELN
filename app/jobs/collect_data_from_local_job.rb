class CollectDataFromLocalJob < ApplicationJob
  queue_as :collect_data

  def perform
    collector = Foldercollector.new
    collector.execute(false)
  end
end
