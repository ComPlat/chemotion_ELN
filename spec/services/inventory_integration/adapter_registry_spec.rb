# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::AdapterRegistry do
  before { described_class.reset! }

  after { described_class.reset! }

  def adapter_with(changes = {}, &body)
    manifest = FakeInventoryAdapter.manifest.merge(changes)
    Class.new(InventoryIntegration::Adapters::Base) do
      define_singleton_method(:manifest) { manifest }
      define_singleton_method(:name) { 'TestAdapter' }
      class_eval(&body) if body
    end
  end

  it 'registers a valid adapter under its key' do
    described_class.register(FakeInventoryAdapter)
    expect(described_class.find('fake')).to eq FakeInventoryAdapter
    expect(described_class).to be_key(:fake)
  end

  it 'runs the load hook adapter gems register through' do
    allow(ActiveSupport).to receive(:run_load_hooks).and_call_original
    described_class.key?('fake')
    expect(ActiveSupport).to have_received(:run_load_hooks).with(:inventory_integration_adapters, described_class)
  end

  it 'refuses a second adapter under a taken key' do
    described_class.register(FakeInventoryAdapter)
    other = adapter_with { define_method(:each_page) { |**| nil } }
    other.define_method(:fetch) { |_id| nil }
    expect { described_class.register(other) }.to raise_error(described_class::InvalidAdapter, /already taken/)
  end

  {
    'a malformed key' => [{ key: 'Fake-Adapter' }, /key 'Fake-Adapter'/],
    'an unknown capability' => [{ capabilities: %i[list teleport] }, /unknown capabilities: teleport/],
    'an unsupported contract' => [{ contracts: ['chemotion.inventory/v0'] }, /contracts must include/],
    'an unknown change detection' => [{ change_detection: :psychic }, /change_detection/],
    'a setting of an unsupported type' => [
      { settings_schema: { 'type' => 'object', 'properties' => { 'ids' => { 'type' => 'array' } } } }, /setting 'ids'/
    ],
  }.each do |label, (changes, message)|
    it "refuses #{label}" do
      expect { described_class.register(adapter_with(changes)) }
        .to raise_error(described_class::InvalidAdapter, message)
    end
  end

  it 'refuses a declared capability whose method is missing' do
    expect { described_class.register(adapter_with(capabilities: %i[list adjust_quantity])) }
      .to raise_error(described_class::InvalidAdapter, /list declared but each_page.*adjust_quantity declared/)
  end

  it 'lists only the adapters the IT config enables' do
    described_class.register(FakeInventoryAdapter)
    enabled = instance_double(InventoryIntegration::IntegrationConfig, enabled_adapter_keys: %w[fake goechem])
    disabled = instance_double(InventoryIntegration::IntegrationConfig, enabled_adapter_keys: [])
    expect(described_class.enabled(enabled)).to eq [FakeInventoryAdapter]
    expect(described_class.enabled(disabled)).to be_empty
  end
end
