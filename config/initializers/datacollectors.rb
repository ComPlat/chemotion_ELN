# frozen_string_literal: true

# set default value
Rails.application.configure { config.datacollectors = nil }

if File.file?(Rails.root.join('config/datacollectors.yml'))
  datacollectors_config = Rails.application.config_for :datacollectors
  if datacollectors_config
    Rails.application.configure do
      config.datacollectors = ActiveSupport::OrderedOptions.new
      config.datacollectors.services = datacollectors_config[:services]
      config.datacollectors.mailcollector = datacollectors_config[:mailcollector]
      config.datacollectors.sftpusers = datacollectors_config[:sftpusers]
      config.datacollectors.localcollectors = datacollectors_config[:localcollectors]
      config.datacollectors.keydir = datacollectors_config[:keydir]
    end
  end
end
