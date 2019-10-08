begin
  datacollectors_config = Rails.application.config_for :datacollectors

  Rails.application.configure do
    config.datacollectors = ActiveSupport::OrderedOptions.new
    config.datacollectors.services = datacollectors_config[:services]
    config.datacollectors.mailcollector = datacollectors_config[:mailcollector]
    config.datacollectors.sftpusers = datacollectors_config[:sftpusers]
    config.datacollectors.localcollectors = datacollectors_config[:localcollectors]
  end
rescue StandardError => e
  puts e.message
  Rails.application.configure do
    config.datacollectors = nil
  end
end
