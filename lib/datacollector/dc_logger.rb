# frozen_string_literal: true

class DCLogger
  def self.log
    @@fw_logger ||= Logger.new("#{Rails.root}/log/datacollector.log")
  end
end
