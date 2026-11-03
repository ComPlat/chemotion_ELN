# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminInventoryIntegrationAPI do
  let(:admin) { create(:admin) }
  let(:current_user) { admin }
  let(:config) { inventory_config }
  let(:base) { '/api/v1/admin/inventory_integration' }

  before do
    allow(WardenAuthentication).to receive(:new)
      .and_return(instance_double(WardenAuthentication, current_user: current_user))
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::AdapterRegistry.register(FakeInventoryAdapter)
    allow(InventoryIntegration::IntegrationConfig).to receive(:current).and_return(config)
    allow(Resolv).to receive(:getaddresses).with('inv.example.org').and_return(['93.184.216.34'])
  end

  after do
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::Redactor.reset!
  end

  describe 'GET /api/v1/admin/inventory_integration/adapters' do
    context 'without a configuration file' do
      let(:config) { InventoryIntegration::IntegrationConfig.new(:off) }

      it 'reports the feature as off' do
        get "#{base}/adapters"
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body).to eq(
          'enabled' => false, 'status' => 'off', 'adapters' => [], 'credential_refs' => [],
        )
      end
    end

    context 'with an enabled adapter' do
      let(:config) { inventory_config(credentials: { lab: { api_key_env: 'LAB_KEY' } }) }

      it 'lists it with its settings schema, allowed hosts and the IT credential names', :aggregate_failures do
        get "#{base}/adapters"
        adapters = response.parsed_body['adapters']
        expect(adapters.size).to eq 1
        expect(adapters.first).to include('key' => 'fake', 'allowed_hosts' => ['inv.example.org'],
                                          'capabilities' => %w[list fetch])
        expect(adapters.first['settings_schema']['properties']).to include('api_key')
        expect(response.parsed_body['credential_refs']).to eq ['lab']
      end
    end

    context 'with an invalid configuration' do
      let(:config) { InventoryIntegration::IntegrationConfig.new(:misconfigured, errors: ["adapter 'x' is not installed"]) }

      it 'answers 503 with the reasons' do
        get "#{base}/adapters"
        expect(response).to have_http_status(:service_unavailable)
        expect(response.parsed_body['errors']).to eq ["adapter 'x' is not installed"]
      end
    end
  end

  context 'when the user is not an admin' do
    let(:current_user) { create(:person) }

    it 'refuses every endpoint' do
      requests = [
        [:get, 'adapters'], [:get, 'inventories'], [:get, 'inventories/candidates'], [:post, 'inventories'],
        [:put, 'inventories/1/archive'],
        [:get, 'connections'], [:post, 'connections'], [:put, 'connections/1'], [:post, 'connections/1/test'],
        [:post, 'connections/1/activate'], [:post, 'connections/1/pause'], [:delete, 'connections/1'],
        [:get, 'connections/1/mapping_versions'], [:post, 'connections/1/mapping_versions'],
        [:post, 'connections/1/mapping_versions/1/accept'], [:post, 'connections/1/mapping_versions/1/discard']
      ]
      statuses = requests.map do |verb, path|
        send(verb, "#{base}/#{path}")
        response.status
      end
      expect(statuses).to all(eq 401)
    end
  end

  context 'when IT has not enabled the feature' do
    let(:config) { InventoryIntegration::IntegrationConfig.new(:off) }

    it 'hides inventories and connections' do
      get "#{base}/inventories"
      expect(response).to have_http_status(:not_found)
      get "#{base}/connections"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'inventories' do
    let(:owner) { create(:person) }
    let(:collection) { create(:collection, user: owner) }

    it 'makes an existing collection an inventory, keeping its owner and flagging its samples', :aggregate_failures do
      sample = create(:sample, creator: owner, collections: [collection])
      post "#{base}/inventories", params: { collection_id: collection.id }
      expect(response).to have_http_status(:created)
      expect(response.parsed_body['inventory']).to include('collection_id' => collection.id, 'owner_id' => owner.id)
      expect(collection.reload.user).to eq owner
      expect(sample.reload.inventory_sample).to be true

      post "#{base}/inventories", params: { collection_id: collection.id }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "lists a person's collections that are not yet inventories" do
      create(:inventory_managed_collection, collection: create(:collection, user: owner, label: 'Taken'))
      collection
      get "#{base}/inventories/candidates", params: { owner_id: owner.id }
      expect(response.parsed_body['collections'].pluck('label')).to eq [collection.label]
    end

    it 'creates a new collection for a person' do
      post "#{base}/inventories", params: { owner_id: owner.id, label: 'Chemicals 2.04' }
      created = Collection.find(response.parsed_body['inventory']['collection_id'])
      expect(created).to have_attributes(label: 'Chemicals 2.04', user_id: owner.id, is_locked: false)
    end

    it 'refuses system collections without creating anything' do
      locked = create(:collection, user: owner, is_locked: true)
      expect { post "#{base}/inventories", params: { collection_id: locked.id } }
        .not_to change(InventoryIntegration::ManagedCollection, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'lists inventories of owners whose account was deleted' do
      create(:inventory_managed_collection, collection: collection)
      owner.destroy
      get "#{base}/inventories"
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['inventories'].first['owner']).to be_present
    end

    it 'archives an inventory only after its connection' do
      inventory = create(:inventory_managed_collection, collection: collection)
      create(:inventory_connection, managed_collection: inventory)
      put "#{base}/inventories/#{inventory.id}/archive"
      expect(response).to have_http_status(:unprocessable_entity)

      inventory.connection.update!(archived_at: Time.current, status: 'archived')
      put "#{base}/inventories/#{inventory.id}/archive"
      expect(inventory.reload).to be_archived
    end
  end

  describe 'connections' do
    let(:inventory) { create(:inventory_managed_collection) }
    let(:create_params) do
      { managed_collection_id: inventory.id, adapter_key: 'fake', name: 'Lab stock', base_url: 'https://inv.example.org/api',
        settings: { scope: 'lab' }, credentials: { api_key: 'k3y-value-1' }, allowed_sharee_ids: [5] }
    end

    def create_connection
      post "#{base}/connections", params: create_params, as: :json
      InventoryIntegration::Connection.find(response.parsed_body.dig('connection', 'id'))
    end

    it 'creates a draft and never returns its credentials', :aggregate_failures do
      create_connection
      expect(response).to have_http_status(:created)
      expect(response.parsed_body['connection']).to include(
        'status' => 'draft', 'credentials_set' => true, 'tested' => false, 'allowed_sharee_ids' => [5],
        'settings' => { 'scope' => 'lab' }
      )
      get "#{base}/connections"
      expect(response.body).not_to include('k3y-value-1')
      expect(response.body).not_to include('credentials_ciphertext')
    end

    it 'answers 422 with the policy code for a host off the allow-list' do
      post "#{base}/connections", params: create_params.merge(base_url: 'https://169.254.169.254'), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to include('code' => 'policy.host_not_allowed')
    end

    it 'refuses a change based on an outdated version' do
      connection = create_connection
      stale = connection.lock_version
      put "#{base}/connections/#{connection.id}", params: { lock_version: stale, name: 'A' }, as: :json
      put "#{base}/connections/#{connection.id}", params: { lock_version: stale, name: 'B' }, as: :json
      expect(response).to have_http_status(:conflict)
      expect(connection.reload.name).to eq 'A'
    end

    it 'tests, maps and activates a connection', :aggregate_failures do
      connection = create_connection
      post "#{base}/connections/#{connection.id}/activate"
      expect(response).to have_http_status(:unprocessable_entity)

      stub_request(:get, 'https://inv.example.org/api/status').to_return(body: '{"count":2}')
      post "#{base}/connections/#{connection.id}/test"
      expect(response.parsed_body['connection']).to include('last_test_ok' => true, 'tested' => true)

      post "#{base}/connections/#{connection.id}/mapping_versions", params: { preset: true }, as: :json
      version_id = response.parsed_body.dig('mapping_version', 'id')
      post "#{base}/connections/#{connection.id}/mapping_versions/#{version_id}/accept"
      expect(response.parsed_body['mapping_version']).to include('status' => 'active', 'accepted_by_id' => admin.id)

      post "#{base}/connections/#{connection.id}/activate"
      expect(response.parsed_body['connection'])
        .to include('status' => 'active', 'active_mapping_version_id' => version_id)
    end

    it 'keeps credentials out of a failed test and its error' do
      connection = create_connection
      stub_request(:get, 'https://inv.example.org/api/status').to_raise(SocketError.new('no route for k3y-value-1'))
      post "#{base}/connections/#{connection.id}/test"
      expect(response.parsed_body['connection']).to include('last_test_ok' => false)
      expect(response.body).not_to include('k3y-value-1')
    end

    it 'keeps stored settings when a change sends null for them' do
      connection = create_connection
      put "#{base}/connections/#{connection.id}", params: { lock_version: connection.lock_version, settings: nil },
                                                  as: :json
      expect(response).to have_http_status(:ok)
      expect(connection.reload.settings).to eq('scope' => 'lab')
    end

    it 'archives a connection' do
      connection = create_connection
      delete "#{base}/connections/#{connection.id}"
      expect(response).to have_http_status(:no_content)
      expect(connection.reload).to have_attributes(status: 'archived', archived_at: be_present)
    end
  end
end
