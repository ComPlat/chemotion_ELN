class CollectFileFromSftpJob < ActiveJob::Base
  queue_as :collect_data
  
  def perform
    collector = Filecollector.new
    collector.execute(true)
  end
end
