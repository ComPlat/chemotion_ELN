# frozen_string_literal: true

# This initializer loads the optional configuration for the backend ketcher rendering service
ref = "Initializing #{File.basename(__FILE__, '.rb')}:"

Rails.application.configure do
  config.ketcher_service = config_for :ketcher_service # Load config/.yml

  # Validate expected settings (url)
  url = URI.parse(config.ketcher_service.url)
  raise ArgumentError, "#{ref} Invalid URL: #{url}" unless url.host && %w[http https].include?(url.scheme)
  ##################################

rescue RuntimeError, ArgumentError, URI::InvalidURIError # Rescue: RuntimeError is raised if the file is not found
  config.ketcher_service = nil                           # Create service key or clear config
ensure
  # Load default missing configuration if the yml file not found or no config is defined for the environment
  config.ketcher_service ||= config_for :default_missing

  info = config.ketcher_service.url.presence || config.ketcher_service.desc
  Rails.logger.info "#{ref} Ketcher-render service: #{info}"
end
