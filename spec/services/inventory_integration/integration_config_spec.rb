# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::IntegrationConfig do
  let(:dir) { Dir.mktmpdir('inventory_integration_config') }
  let(:path) { File.join(dir, 'inventory_integration.yml') }
  let(:example) do
    YAML.safe_load(Rails.root.join('config/inventory_integration.yml.example').read, permitted_classes: [Symbol])
  end

  before do
    InventoryIntegration::AdapterRegistry.reset!
    InventoryIntegration::AdapterRegistry.register(FakeInventoryAdapter)
  end

  after do
    FileUtils.remove_entry(dir)
    InventoryIntegration::AdapterRegistry.reset!
  end

  def load_with(shared)
    File.write(path, { shared: shared }.to_yaml)
    described_class.load(path, env: 'test')
  end

  def valid_settings
    { enabled: true, adapters: { fake: { enabled: true, allowed_hosts: ['inventory.example.org', '*.example.edu'] } } }
  end

  it 'is off without a file' do
    config = described_class.load(File.join(dir, 'missing.yml'), env: 'test')
    expect([config.status, config.enabled?, config.enabled_adapter_keys]).to eq [:off, false, []]
  end

  it 'enables the adapters the file enables' do
    config = load_with(valid_settings)
    expect([config.status, config.enabled_adapter_keys]).to eq [:ok, ['fake']]
    expect(config.allowed_hosts(:fake)).to eq ['inventory.example.org', '*.example.edu']
  end

  it 'turns nothing on when disabled globally' do
    config = load_with(valid_settings.merge(enabled: false))
    expect([config.status, config.enabled_adapter_keys]).to eq [:ok, []]
  end

  it 'parses the shipped example once its adapter is installed' do
    shared = example['shared'].deep_dup
    shared[:adapters] = { fake: shared[:adapters][:goechem] }
    config = load_with(shared)
    expect(config.errors).to be_empty
  end

  it 'marks unknown adapters, malformed hosts and bad CIDR ranges as misconfigured' do
    config = load_with(valid_settings.deep_merge(adapters: { elsewhere: { enabled: true },
                                                             fake: { allowed_hosts: ['http://x.org'] } },
                                                 network: { allow_private_cidrs: ['10.0.0.0/33'] }))
    expect(config).to be_misconfigured
    expect(config.errors.join("\n")).to include("'elsewhere' is not installed", "'http://x.org'", "'10.0.0.0/33'")
    expect(config.enabled_adapter_keys).to be_empty
  end

  it 'marks unknown settings and unreadable files as misconfigured' do
    expect(load_with(valid_settings.merge(enabeld: true)).errors).to include('unknown settings: enabeld')
    File.write(path, "shared:\n  :enabled: [unclosed\n")
    expect(described_class.load(path, env: 'test')).to be_misconfigured
  end
end
