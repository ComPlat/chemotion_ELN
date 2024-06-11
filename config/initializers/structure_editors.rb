# frozen_string_literal: true

# This load the optional configuration for additional structure editors.

ref = "Initializing #{File.basename(__FILE__, '.rb')}:"

Rails.application.configure do
  config.structure_editors = nil                            # Create service
  config.structure_editors = config_for :structure_editors  # Load config/.yml
rescue RuntimeError                                         # Rescue if the yml file is not found
  Rails.logger.info "#{ref} yml configuration not found"
ensure
  # Load default missing configuration if ketcher_service.yml not found or no config is defined for the environment
  config.structure_editors ||= config_for :default_missing

  info = config.structure_editors.editors&.size || config.structure_editors.desc
  Rails.logger.info "#{ref} optional editors: #{info}"
end
