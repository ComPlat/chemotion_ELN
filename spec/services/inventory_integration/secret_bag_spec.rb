# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::SecretBag do
  let(:config) { inventory_config(credentials: { lab: { api_key_env: 'INVENTORY_SPEC_API_KEY' } }) }
  let(:box) { InventoryIntegration::SecretBox.new(InventoryIntegration::SecretBox.key(config)) }
  let(:connection) { build(:inventory_connection, credentials_ciphertext: box.seal(api_key: 'sealed-value-1')) }

  after do
    InventoryIntegration::Redactor.reset!
    ENV.delete('INVENTORY_SPEC_API_KEY')
  end

  it 'opens sealed credentials and registers each value with the redactor' do
    expect(described_class.new(connection, config: config).fetch(:api_key)).to eq 'sealed-value-1'
    expect(InventoryIntegration::Redactor.redact('x sealed-value-1')).to eq 'x [FILTERED]'
  end

  it 'reads an IT credential from the variables it names' do
    ENV['INVENTORY_SPEC_API_KEY'] = 'env-value-1'
    connection.assign_attributes(credentials_ciphertext: nil, credentials_ref: 'lab')
    expect(described_class.new(connection, config: config).fetch('api_key')).to eq 'env-value-1'
  end

  it 'refuses an unknown reference, a missing variable and a missing field' do
    connection.credentials_ref = 'lab'
    expect { described_class.new(connection, config: config).fetch(:api_key) }
      .to raise_error(InventoryIntegration::Errors::CredentialsUnreadable, /lacks INVENTORY_SPEC_API_KEY/)
    connection.credentials_ref = 'elsewhere'
    expect { described_class.new(connection, config: config).fetch(:api_key) }
      .to raise_error(InventoryIntegration::Errors::CredentialsUnreadable, /not configured/)
    connection.assign_attributes(credentials_ref: nil, credentials_ciphertext: nil)
    expect { described_class.new(connection, config: config).fetch(:api_key) }
      .to raise_error(InventoryIntegration::Errors::ConfigurationError)
  end

  it 'never shows values when inspected' do
    bag = described_class.new(connection, config: config)
    bag.fetch(:api_key)
    expect(bag.inspect).not_to include('sealed-value-1')
  end
end
