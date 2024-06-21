# frozen_string_literal: true

# This initializer loads the optional configuration for additional structure editors.
ref = "Initializing #{File.basename(__FILE__, '.rb')}:"

Rails.application.configure do
  config.structure_editors = config_for :structure_editors  # Load config/.yml
rescue RuntimeError                                         # Rescue if the yml file is not found
  config.structure_editors = nil                            # Create service key or clear config
ensure
  # Load default missing configuration if the yml file not found or no config is defined for the environment
  config.structure_editors ||= config_for :default_missing

  info = config.structure_editors.editors&.size || config.structure_editors.desc
  Rails.logger.info "#{ref} optional editors: #{info}"
end
