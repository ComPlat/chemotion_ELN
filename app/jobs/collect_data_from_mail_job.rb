class CollectDataFromMailJob < ActiveJob::Base

  def perform
    begin
      collector = Mailcollector.new
      collector.execute
    rescue Exception => e
      puts e
    end
  end

end
