# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AddressFamilyPreference do
  before { described_class.reset! }

  after { described_class.reset! }

  def with_family(value)
    stub_const('ENV', ENV.to_hash.merge('ELN_PREFER_ADDRESS_FAMILY' => value))
    described_class.reset!
  end

  describe '.preferred_family' do
    it 'reads the configured family' do
      with_family('ipv6')

      expect(described_class.preferred_family).to eq 'ipv6'
    end

    it 'normalises case and surrounding whitespace' do
      with_family('  IPv6 ')

      expect(described_class.preferred_family).to eq 'ipv6'
    end

    it 'is nil when unset' do
      with_family('')

      expect(described_class.preferred_family).to be_nil
    end

    it 'is nil for an unrecognised value, rather than guessing' do
      with_family('inet6')

      expect(described_class.preferred_family).to be_nil
    end
  end

  describe '.enabled?' do
    it 'is false unless a valid family is configured' do
      with_family('nonsense')

      expect(described_class).not_to be_enabled
    end

    it 'is true for a valid family' do
      with_family('ipv4')

      expect(described_class).to be_enabled
    end
  end

  describe '.pick' do
    let(:dual_stack) { ['192.0.2.1', '2001:db8::1'] }

    it 'returns the first address of the preferred family' do
      with_family('ipv6')

      expect(described_class.pick(dual_stack)).to eq '2001:db8::1'
    end

    it 'honours an ipv4 preference symmetrically' do
      with_family('ipv4')

      expect(described_class.pick(['2001:db8::1', '192.0.2.1'])).to eq '192.0.2.1'
    end

    it 'returns nil when the host publishes no address of that family, so callers can fall back' do
      with_family('ipv6')

      expect(described_class.pick(['192.0.2.1'])).to be_nil
    end

    it 'accepts Resolv address objects, not just strings' do
      with_family('ipv6')

      expect(described_class.pick([Resolv::IPv4.create('192.0.2.1'), Resolv::IPv6.create('2001:db8::1')]))
        .to eq '2001:db8::1'
    end

    it 'skips unparseable entries instead of raising' do
      with_family('ipv6')

      expect(described_class.pick(['not-an-address', '2001:db8::1'])).to eq '2001:db8::1'
    end
  end

  describe 'the resolver override installed by the initializer' do
    # Exercises the same override the initializer prepends, without patching Resolv globally.
    let(:override) do
      Module.new do
        def getaddress(host)
          Chemotion::AddressFamilyPreference.pick(getaddresses(host)) || super
        end
      end
    end

    let(:stock_resolver) do
      Class.new do
        def self.getaddresses(_host)
          ['192.0.2.1', '2001:db8::1']
        end

        def self.getaddress(_host)
          '192.0.2.1'
        end
      end
    end

    let(:resolver) do
      stock_resolver.singleton_class.prepend(override)
      stock_resolver
    end

    it 'returns the preferred family when the host publishes one' do
      with_family('ipv6')

      expect(resolver.getaddress('dual.example')).to eq '2001:db8::1'
    end

    it 'falls back to stock resolution for a single-family host' do
      with_family('ipv6')
      allow(resolver).to receive(:getaddresses).and_return(['192.0.2.1'])

      expect(resolver.getaddress('v4only.example')).to eq '192.0.2.1'
    end
  end
end
