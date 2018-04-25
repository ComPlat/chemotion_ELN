class CollectDataFromMailJob < ActiveJob::Base

  def perform
    collector = Mailcollector.new
    collector.execute
  end

end
