class CollectDataFromSftpJob < ActiveJob::Base
  queue_as :collect_data

  def perform
    collector = Foldercollector.new
    collector.execute(true)
  end
end
