# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'ketcher_service.yml')
  ketcher_svc_config = Rails.application.config_for(:ketcher_service)
  url = ketcher_svc_config[:url]

  Rails.application.configure do
    config.ketcher_service = ActiveSupport::OrderedOptions.new
    config.ketcher_service.url = url
  end

  Rails.logger.info("Render service configured at: #{Rails.configuration.try(:ketcher_service).try(:url)}")
end
