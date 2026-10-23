# frozen_string_literal: true

module Chemotion
  # Admin endpoints of the external inventory integration.
  class AdminInventoryIntegrationAPI < Grape::API
    resource :admin do
      namespace :inventory_integration do
        before do
          error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
        end

        desc 'Adapters this server enables, with their settings schemas and allowed hosts'
        get :adapters do
          config = InventoryIntegration::IntegrationConfig.current
          error!({ enabled: false, status: 'misconfigured', errors: config.errors }, 503) if config.misconfigured?

          adapters = InventoryIntegration::AdapterRegistry.enabled(config).map do |adapter|
            manifest = adapter.manifest
            manifest.slice(:key, :name, :version, :capabilities, :change_detection, :mapping, :default_preset,
                           :settings_schema).merge(allowed_hosts: config.allowed_hosts(manifest[:key]))
          end
          { enabled: config.enabled?, status: config.status.to_s, adapters: adapters }
        end
      end
    end
  end
end
