# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminInventoryIntegrationAPI do
  let(:admin) { create(:admin) }
  let(:current_user) { admin }

  before do
    allow(WardenAuthentication).to receive(:new)
      .and_return(instance_double(WardenAuthentication, current_user: current_user))
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::AdapterRegistry.register(FakeInventoryAdapter)
    allow(InventoryIntegration::IntegrationConfig).to receive(:current).and_return(config)
  end

  after { InventoryIntegration::AdapterRegistry.reset! }

  describe 'GET /api/v1/admin/inventory_integration/adapters' do
    context 'without a configuration file' do
      let(:config) { InventoryIntegration::IntegrationConfig.new(:off) }

      it 'reports the feature as off' do
        get '/api/v1/admin/inventory_integration/adapters'
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body).to eq('enabled' => false, 'status' => 'off', 'adapters' => [])
      end
    end

    context 'with an enabled adapter' do
      let(:config) do
        InventoryIntegration::IntegrationConfig.new(
          :ok, { 'enabled' => true, 'adapters' => { 'fake' => { 'enabled' => true, 'allowed_hosts' => ['x.org'] } } }
        )
      end

      it 'lists it with its settings schema and allowed hosts' do
        get '/api/v1/admin/inventory_integration/adapters'
        adapters = response.parsed_body['adapters']
        adapter = adapters.first
        expect(adapters.size).to eq 1
        expect(adapter).to include('key' => 'fake', 'allowed_hosts' => ['x.org'], 'capabilities' => %w[list fetch])
        expect(adapter['settings_schema']['properties']).to include('api_key')
      end
    end

    context 'with an invalid configuration' do
      let(:config) { InventoryIntegration::IntegrationConfig.new(:misconfigured, errors: ["adapter 'x' is not installed"]) }

      it 'answers 503 with the reasons' do
        get '/api/v1/admin/inventory_integration/adapters'
        expect(response).to have_http_status(:service_unavailable)
        expect(response.parsed_body['errors']).to eq ["adapter 'x' is not installed"]
      end
    end

    context 'when the user is not an admin' do
      let(:config) { InventoryIntegration::IntegrationConfig.new(:off) }
      let(:current_user) { create(:person) }

      it 'refuses' do
        get '/api/v1/admin/inventory_integration/adapters'
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
