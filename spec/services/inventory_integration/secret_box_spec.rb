# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::SecretBox do
  let(:box) { described_class.new(SecureRandom.bytes(32)) }
  let(:sealed) { box.seal(api_key: 'top-secret-value') }

  it 'seals with a version prefix and opens again' do
    expect(sealed).to start_with('v1:').and(satisfy { |text| text.exclude?('top-secret-value') })
    expect(box.open(sealed)).to eq('api_key' => 'top-secret-value')
  end

  it 'raises instead of returning stored text it cannot decrypt' do
    other_key = described_class.new(SecureRandom.bytes(32))
    ["#{sealed}x", 'top-secret-value', nil].each do |text|
      expect { box.open(text) }.to raise_error(InventoryIntegration::Errors::CredentialsUnreadable)
    end
    expect { other_key.open(sealed) }.to raise_error(InventoryIntegration::Errors::CredentialsUnreadable)
  end

  it 'fingerprints credentials with the key' do
    fingerprint = box.fingerprint(api_key: 'a')
    expect(fingerprint).to eq(box.fingerprint('api_key' => 'a')).and(have_attributes(size: 16))
    expect(described_class.new(SecureRandom.bytes(32)).fingerprint(api_key: 'a')).not_to eq fingerprint
  end

  describe '.key' do
    let(:config) { inventory_config(encryption_key_env: 'INVENTORY_SPEC_KEY') }

    around do |example|
      example.run
    ensure
      ENV.delete('INVENTORY_SPEC_KEY')
    end

    it 'derives a key from secret_key_base when IT names no variable' do
      expect(described_class.key(inventory_config).bytesize).to eq 32
    end

    it 'reads 64 hex characters or base64 from the variable IT names' do
      ENV['INVENTORY_SPEC_KEY'] = 'ab' * 32
      expect(described_class.key(config)).to eq ['ab' * 32].pack('H*')
      ENV['INVENTORY_SPEC_KEY'] = Base64.strict_encode64('k' * 32)
      expect(described_class.key(config)).to eq 'k' * 32
    end

    it 'refuses a missing or short key' do
      expect { described_class.key(config) }.to raise_error(InventoryIntegration::Errors::CredentialsUnreadable)
      ENV['INVENTORY_SPEC_KEY'] = 'short'
      expect { described_class.key(config) }.to raise_error(InventoryIntegration::Errors::CredentialsUnreadable)
    end
  end
end
