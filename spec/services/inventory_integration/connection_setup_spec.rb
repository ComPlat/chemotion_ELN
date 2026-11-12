# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::ConnectionSetup do
  let(:config) { inventory_config(credentials: { lab: { api_key_env: 'INVENTORY_SPEC_API_KEY' } }) }
  let(:admin) { create(:admin) }
  let(:inventory) { create(:inventory_managed_collection) }
  let(:connection) { InventoryIntegration::Connection.new(managed_collection: inventory) }
  let(:setup) { described_class.new(connection, actor: admin, config: config) }
  let(:params) do
    { adapter_key: 'fake', name: 'Lab stock', base_url: 'https://inv.example.org/api/', settings: { scope: 'lab' },
      credentials: { api_key: 'k3y-value-1' } }
  end
  let(:errors) { InventoryIntegration::Errors }

  before do
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::AdapterRegistry.register(FakeInventoryAdapter)
    allow(Resolv).to receive(:getaddresses).with('inv.example.org').and_return(['93.184.216.34'])
  end

  after do
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::Redactor.reset!
  end

  def stub_status(**response)
    stub_request(:get, 'https://inv.example.org/api/status').to_return({ body: '{"count":3}' }.merge(response))
  end

  def accept_preset
    service = InventoryIntegration::MappingVersions.new(connection, actor: admin)
    service.accept!(service.draft_preset!(FakeInventoryAdapter))
  end

  it 'creates a draft with sealed credentials and the keys the adapter computes' do
    setup.update!(params)
    expect(connection.reload).to have_attributes(
      status: 'draft', base_url: 'https://inv.example.org/api', settings: { 'scope' => 'lab' },
      source_key: 'fake@inv.example.org', scope_key: 'scope=lab', created_by: admin, credentials_key_version: 1
    )
    expect(connection.credentials_ciphertext).to start_with('v1:').and(satisfy { |text| text.exclude?('k3y-value-1') })
  end

  it 'refuses hosts off the allow-list with the policy code' do
    expect { setup.update!(params.merge(base_url: 'https://evil.example.com')) }
      .to raise_error(errors::HostNotAllowed) { |error| expect(error.code).to eq 'policy.host_not_allowed' }
  end

  it 'refuses secrets among the settings, invalid settings and adapters IT did not enable' do
    expect { setup.update!(params.merge(settings: { scope: 'lab', api_key: 'x' })) }
      .to raise_error(errors::ConfigurationError, /secrets belong in credentials/)
    expect do
      setup.update!(params.merge(settings: { scope: '' }))
    end.to raise_error(errors::ConfigurationError, %r{settings/scope})
    expect do
      setup.update!(params.merge(adapter_key: 'other'))
    end.to raise_error(errors::ConfigurationError, /not enabled/)
  end

  it 'keeps stored credentials for blank fields, and can use an IT credential instead' do
    setup.update!(params)
    fingerprint = connection.credentials_fingerprint
    setup.update!(credentials: { api_key: '' })
    expect(connection.credentials_fingerprint).to eq fingerprint

    setup.update!(credentials_ref: 'lab')
    expect(connection).to have_attributes(credentials_ref: 'lab', credentials_ciphertext: nil)
    expect { setup.update!(credentials_ref: 'elsewhere') }.to raise_error(errors::ConfigurationError)
  end

  it 'refuses a second connection to the same source and scope' do
    setup.update!(params)
    twin = InventoryIntegration::Connection.new(managed_collection: create(:inventory_managed_collection))
    expect { described_class.new(twin, actor: admin, config: config).update!(params) }
      .to raise_error(ActiveRecord::RecordInvalid, /already imports this source/)
  end

  it 'activates only after a passing test of the current settings and an accepted mapping', :aggregate_failures do
    setup.update!(params)
    expect { setup.activate! }.to raise_error(errors::ConfigurationError, /test the connection/)

    stub_status
    setup.test!
    expect(connection).to have_attributes(last_test_ok: true, tested?: true)
    expect(connection.last_test_report).to include('sample_count' => 3)
    expect { setup.activate! }.to raise_error(errors::ConfigurationError, /accept a mapping/)

    accept_preset
    expect(setup.activate!.status).to eq 'active'

    setup.update!(settings: { scope: 'other' })
    expect(connection).to have_attributes(status: 'draft', tested?: false)
    expect { setup.activate! }.to raise_error(errors::ConfigurationError, /test the connection/)
  end

  it 'records a failed test with a code and without the credentials' do
    setup.update!(params)
    stub_status(status: 401, body: 'denied for k3y-value-1')
    setup.test!
    expect(connection.last_test_ok).to be false
    expect(connection.last_test_report['error']).to include('code' => 'auth.unauthorized')
    expect(connection.last_test_report.to_json).not_to include('k3y-value-1')
  end

  it 'records unexpected adapter failures and redacts whole reports' do
    setup.update!(params)
    allow(FakeInventoryAdapter).to receive(:new).and_wrap_original do |original, **args|
      original.call(**args).tap { |adapter| allow(adapter).to receive(:test_connection).and_raise(Timeout::Error, 'k3y-value-1') }
    end
    setup.test!
    expect(connection.last_test_report['error']).to include('code' => 'adapter.failed')
    expect(connection.last_test_report.to_json).not_to include('k3y-value-1')
  end

  it 'pauses an active connection whose credentials no longer decrypt' do
    setup.update!(params)
    stub_status
    setup.test!
    accept_preset
    setup.activate!

    rotated = inventory_config(encryption_key_env: 'INVENTORY_SPEC_KEY')
    ENV['INVENTORY_SPEC_KEY'] = 'cd' * 32
    described_class.new(connection, actor: admin, config: rotated).test!
    expect(connection).to have_attributes(status: 'paused', last_test_ok: false)
    expect(connection.last_test_report['error']).to include('code' => 'config.credentials_unreadable')
  ensure
    ENV.delete('INVENTORY_SPEC_KEY')
  end
end
