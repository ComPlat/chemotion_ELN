# frozen_string_literal: true

# This load the optional configuration for the backend ketcher rendering service

ref = "Initializing #{File.basename(__FILE__, '.rb')}:"

Rails.application.configure do
  config.ketcher_service = nil                           # Create service config
  config.ketcher_service = config_for :ketcher_service   # Load config/.yml
rescue RuntimeError                                      # Rescue: RuntimeError is raised if the file is not found
  Rails.logger.info "#{ref} yml configuration not found"
ensure
  # Load default missing configuration if ketcher_service.yml not found or no config is defined for the environment
  config.ketcher_service ||= config_for :default_missing

  if (info = config.ketcher_service.url || config.ketcher_service.desc)
    Rails.logger.info "#{ref} Ketcher-render service: #{info}"
  else
    Rails.logger.warn "#{ref} Ketcher render service: configuration found but no url defined"
  end
end
