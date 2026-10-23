# frozen_string_literal: true

# An enabled IT configuration with the fake adapter on inv.example.org, for integration specs.
module InventoryIntegrationConfigHelpers
  def inventory_config(**settings)
    adapters = { 'fake' => { 'enabled' => true, 'allowed_hosts' => ['inv.example.org'] } }
    InventoryIntegration::IntegrationConfig.new(:ok, { 'enabled' => true, 'adapters' => adapters }
      .merge(settings.deep_stringify_keys))
  end
end

RSpec.configure { |config| config.include InventoryIntegrationConfigHelpers }
