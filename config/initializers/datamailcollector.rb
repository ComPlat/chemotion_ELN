if File.exist? Rails.root.join('config', 'datamailcollector.yml')
  datamailcollector_config = Rails.application.config_for :datamailcollector

  Rails.application.configure do
    config.datamailcollector = ActiveSupport::OrderedOptions.new
    config.datamailcollector.server = datamailcollector_config[:server]
    config.datamailcollector.port = datamailcollector_config[:port]
    config.datamailcollector.ssl = datamailcollector_config[:ssl]
    config.datamailcollector.mail_address = datamailcollector_config[:mail_address]
    config.datamailcollector.password = datamailcollector_config[:password]
  end
end
