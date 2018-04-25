class CollectFileFromSftpJob < ActiveJob::Base
  def perform
    collector = Filecollector.new
    collector.execute(true)
  end
end
