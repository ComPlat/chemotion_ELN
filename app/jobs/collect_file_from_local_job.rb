class CollectFileFromLocalJob < ActiveJob::Base
  def perform
    collector = Filecollector.new
    collector.execute(false)
  end
end
