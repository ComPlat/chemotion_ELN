begin
  editors_config = Rails.application.config_for :editors

  Rails.application.configure do
    config.editors = ActiveSupport::OrderedOptions.new
    config.editors.docserver = editors_config[:docserver] if editors_config
    config.editors.info = editors_config[:info] if editors_config
    config.editors.docserver_api = config.editors.docserver[:protocol] + '://' + config.editors.docserver[:host] + ':' + config.editors.docserver[:port] + config.editors.docserver[:api]
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    config.editors = nil
  end
end
