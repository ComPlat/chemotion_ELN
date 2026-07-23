# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LdapAuthenticationService do
  let(:config) do
    {
      'enable' => true,
      'host' => 'ldap.example.org',
      'port' => 389,
      'base' => 'dc=example,dc=org',
      'uid' => 'uid',
      'bind_dn' => 'cn=service,dc=example,dc=org',
      'password' => 'service-secret',
    }
  end

  let(:entry) do
    Net::LDAP::Entry.new('uid=jdoe,dc=example,dc=org').tap do |e|
      e[:uid] = ['jdoe']
      e[:mail] = ['jane.doe@bar.de']
      e[:givenname] = ['Jane']
      e[:sn] = ['Doe']
    end
  end

  let(:connection) { instance_double(Net::LDAP) }

  before { allow(Net::LDAP).to receive(:new).and_return(connection) }

  describe '.enabled?' do
    it 'is true when the ldap config has enable: true' do
      allow(described_class).to receive(:config).and_return(config)
      expect(described_class.enabled?).to be(true)
    end

    it 'is false when there is no ldap config' do
      allow(described_class).to receive(:config).and_return(nil)
      expect(described_class.enabled?).to be(false)
    end
  end

  describe '#authenticate' do
    subject(:result) { described_class.new(config).authenticate('jdoe', 'secret') }

    it 'returns normalized attributes on a successful bind' do
      allow(connection).to receive(:bind_as).and_return([entry])

      expect(result).to eq(
        provider: 'ldap', uid: 'jdoe', email: 'jane.doe@bar.de',
        first_name: 'Jane', last_name: 'Doe', groups: []
      )
    end

    it 'returns nil when the bind fails' do
      allow(connection).to receive(:bind_as).and_return(false)

      expect(result).to be_nil
    end

    it 'returns nil without binding when credentials are blank' do
      allow(connection).to receive(:bind_as)

      expect(described_class.new(config).authenticate('jdoe', '')).to be_nil
      expect(connection).not_to have_received(:bind_as)
    end

    it 'returns nil when ldap is not enabled' do
      expect(described_class.new(config.merge('enable' => false)).authenticate('jdoe', 'secret')).to be_nil
    end
  end
end
