# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'ketcher_service.yml')
    node_config = Rails.application.config_for(:ketcher_service)
    transport = node_config[:transport]
    endpoint = node_config[:endpoint]

    Rails.application.configure do
      config.ketcher_service = ActiveSupport::OrderedOptions.new
      config.ketcher_service.transport = transport
      config.ketcher_service.endpoint = endpoint
    end
  end
