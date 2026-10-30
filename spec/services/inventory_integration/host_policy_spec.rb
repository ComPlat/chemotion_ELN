# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::HostPolicy do
  let(:addresses) do
    {
      'inv.example.org' => ['93.184.216.34'], 'meta.example.org' => ['169.254.169.254'],
      'intra.example.org' => ['10.1.2.3'], 'mapped.example.org' => ['::ffff:127.0.0.1'],
      'split.example.org' => ['93.184.216.34', '127.0.0.1'], 'nowhere.example.org' => [],
      'nat64.example.org' => ['64:ff9b::7f00:1']
    }
  end
  let(:network) { { 'allow_private_cidrs' => [], 'allow_http_hosts' => ['plain.example.org'] } }
  let(:policy) do
    described_class.new(allowed_hosts: ['inv.example.org', '*.example.org'], network: network,
                        resolver: ->(host) { addresses.fetch(host) })
  end

  it 'normalises an allowed URL' do
    expect(policy.normalize!('https://INV.example.org/api/').to_s).to eq 'https://inv.example.org/api'
    expect(policy.normalize!('http://plain.example.org').to_s).to eq 'http://plain.example.org'
  end

  {
    'a host off the list' => 'https://example.com/', 'the wildcard domain itself' => 'https://example.org',
    'plain http' => 'http://inv.example.org', 'user information' => 'https://u:p@inv.example.org',
    'a query' => 'https://inv.example.org/?key=1', 'another scheme' => 'ftp://inv.example.org', 'no URL' => 'x y'
  }.each do |label, url|
    it "refuses #{label}" do
      expect { policy.normalize!(url) }.to raise_error(InventoryIntegration::Errors::HostNotAllowed)
    end
  end

  it 'pins the resolved address' do
    expect(policy.resolve!('inv.example.org')).to eq IPAddr.new('93.184.216.34')
  end

  it 'refuses metadata, loopback and unresolvable hosts even under a wildcard' do
    %w[meta.example.org mapped.example.org split.example.org nowhere.example.org nat64.example.org].each do |host|
      expect { policy.resolve!(host) }.to raise_error(InventoryIntegration::Errors::HostNotAllowed, /#{host}/)
    end
  end

  it 'refuses private addresses unless IT allows their range' do
    expect do
      policy.resolve!('intra.example.org')
    end.to raise_error(InventoryIntegration::Errors::HostNotAllowed, /private/)
    allowed = described_class.new(allowed_hosts: ['*.example.org'],
                                  network: { 'allow_private_cidrs' => ['10.0.0.0/8'] },
                                  resolver: ->(host) { addresses.fetch(host) })
    expect(allowed.resolve!('intra.example.org')).to eq IPAddr.new('10.1.2.3')
  end

  it 'keeps link-local blocked even inside an allowed private range' do
    open = described_class.new(allowed_hosts: ['*.example.org'], network: { 'allow_private_cidrs' => ['0.0.0.0/0'] },
                               resolver: ->(host) { addresses.fetch(host) })
    expect { open.resolve!('meta.example.org') }.to raise_error(InventoryIntegration::Errors::HostNotAllowed)
  end
end
