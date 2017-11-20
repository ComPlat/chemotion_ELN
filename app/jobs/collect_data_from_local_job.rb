class CollectDataFromLocalJob < ActiveJob::Base
  def perform
    collector = Foldercollector.new
    collector.execute(false)
  end
end
