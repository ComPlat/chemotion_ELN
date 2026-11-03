# frozen_string_literal: true

# Reports whether the external inventory integration is off, enabled or misconfigured
# (config/inventory_integration.yml, see the .example file). Nothing else runs at boot.
Rails.application.config.after_initialize do
  config = InventoryIntegration::IntegrationConfig.current
  message = "Initializing inventory_integration: #{config.description}"
  config.misconfigured? ? Rails.logger.warn(message) : Rails.logger.info(message)
end
