class CollectDataFromLocalJob < ActiveJob::Base
  queue_as :collect_data

  def perform
    collector = Foldercollector.new
    collector.execute(false)
  end
end
