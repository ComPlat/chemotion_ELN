# frozen_string_literal: true

# Generic initialization
service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  config.send(service_setter, config_for(service)) # Load config/.yml
# Rescue:
# - RuntimeError is raised if the file is not found
# - NoMethodError is raised if the yml file cannot be parsed
rescue RuntimeError, NoMethodError, ArgumentError, URI::InvalidURIError => e
  Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
  # Create service key or clear config
  config.send(service_setter, nil)
end
