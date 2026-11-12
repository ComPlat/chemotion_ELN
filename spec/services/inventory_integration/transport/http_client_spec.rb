# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::Transport::HttpClient do
  let(:resolved) { ['93.184.216.34'] }
  let(:policy) do
    InventoryIntegration::HostPolicy.new(allowed_hosts: ['inv.example.org'], network: {}, resolver: lambda { |_host|
      resolved
    })
  end
  let(:network) { InventoryIntegration::IntegrationConfig::NETWORK_DEFAULTS.merge('max_response_mb' => 1) }
  let(:auth) { InventoryIntegration::Transport::Auth::Header.new('X-Api-Key', 'k3y-value-1') }
  let(:client) { described_class.new(base_url: 'https://inv.example.org/api/', policy: policy, network: network, auth: auth) }
  let(:auth_module) { InventoryIntegration::Transport::Auth }
  let(:errors) { InventoryIntegration::Errors }

  after { InventoryIntegration::Redactor.reset! }

  it 'requests paths below the base URL with the credentials' do
    stub = stub_request(:get, 'https://inv.example.org/api/items?page=2')
           .with(headers: { 'X-Api-Key' => 'k3y-value-1' }).to_return(body: '{"ok":true}')
    expect(client.get('/items', query: { page: 2 }).json).to eq('ok' => true)
    expect(stub).to have_been_requested
  end

  it 'adds query and basic credentials' do
    query = stub_request(:get, 'https://inv.example.org/api/x?a=1&key=k3y-value-1')
    basic = stub_request(:get, 'https://inv.example.org/api/x').with(basic_auth: %w[user pass])
    described_class.new(base_url: 'https://inv.example.org/api', policy: policy, network: network,
                        auth: auth_module::Query.new('key', 'k3y-value-1')).get('x', query: { a: 1 })
    described_class.new(base_url: 'https://inv.example.org/api', policy: policy, network: network,
                        auth: auth_module::Basic.new('user', 'pass')).get('x')
    expect([query, basic]).to all(have_been_requested)
  end

  {
    401 => :AuthenticationError, 403 => :PermissionError, 404 => :NotFound, 503 => :TransientError,
    418 => :UpstreamContractError, 302 => :UpstreamContractError
  }.each do |status, error|
    it "raises #{error} for HTTP #{status}, without following redirects" do
      redirect = { 'Location' => 'http://169.254.169.254/' }
      stub_request(:get, 'https://inv.example.org/api/x').to_return(status: status, headers: redirect)
      expect { client.get('x') }
        .to raise_error(errors.const_get(error), "inv.example.org answered HTTP #{status}")
    end
  end

  it 'passes on the Retry-After of HTTP 429' do
    stub_request(:get, 'https://inv.example.org/api/x').to_return(status: 429, headers: { 'Retry-After' => '30' })
    expect { client.get('x') }.to raise_error(errors::RateLimited) { |error| expect(error.retry_after).to eq 30 }
  end

  it 'stops reading a response above the size limit' do
    stub_request(:get, 'https://inv.example.org/api/x').to_return(body: 'x' * ((1024 * 1024) + 1))
    expect { client.get('x') }.to raise_error(errors::UpstreamContractError, /exceeds 1 MB/)
  end

  it 'refuses absolute paths, protocol-relative paths and paths leaving the base path' do
    ['http://169.254.169.254/latest', '//evil.example.com/x', '../admin', 'a/./b', 'x?y=1'].each do |path|
      expect { client.get(path) }.to raise_error(ArgumentError)
    end
  end

  it 'encodes one path segment for values from the source' do
    expect(described_class.segment('a/../b?c')).to eq 'a%2F..%2Fb%3Fc'
  end

  it 'reports network failures without the credentials' do
    InventoryIntegration::Redactor.register('k3y-value-1')
    stub_request(:get, /inv.example.org/).to_raise(SocketError.new('failed for /api/x?key=k3y-value-1'))
    expect { client.get('x') }.to raise_error(errors::TransientError) { |error|
      expect(error.message).not_to include('k3y-value-1')
    }
  end

  it 'refuses a host whose address the policy blocks, before connecting' do
    resolved.replace(['169.254.169.254'])
    stub = stub_request(:get, /inv.example.org/)
    expect { client.get('x') }.to raise_error(errors::HostNotAllowed)
    expect(stub).not_to have_been_requested
  end
end
