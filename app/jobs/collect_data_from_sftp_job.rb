class CollectDataFromSftpJob < ActiveJob::Base
  def perform
    collector = Foldercollector.new
    collector.execute(true)
  end
end
