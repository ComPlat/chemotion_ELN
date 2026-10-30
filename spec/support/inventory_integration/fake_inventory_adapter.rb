# frozen_string_literal: true

# Smallest adapter that passes the registry checks, for specs of the integration core. Its test
# calls GET <base_url>/status with the api_key credential as an X-Api-Key header.
class FakeInventoryAdapter < InventoryIntegration::Adapters::Base
  PRESET = JSON.parse(Rails.root.join('spec/fixtures/inventory_integration/mapping/example.json').read).freeze

  def self.manifest
    {
      key: 'fake',
      name: 'Fake inventory',
      version: '1.0.0',
      contracts: [InventoryIntegration::Contract::ID],
      capabilities: %i[list fetch],
      change_detection: :snapshot,
      mapping: :overridable,
      default_preset: PRESET,
      settings_schema: {
        'type' => 'object',
        'additionalProperties' => false,
        'required' => %w[scope api_key],
        'properties' => {
          'scope' => { 'type' => 'string', 'minLength' => 1 },
          'api_key' => { 'type' => 'string', 'x-secret' => true },
        },
      },
    }
  end

  def self.http_auth(secrets:, settings:) # rubocop:disable Lint/UnusedMethodArgument
    InventoryIntegration::Transport::Auth::Header.new('X-Api-Key', secrets.fetch(:api_key))
  end

  def source_key
    "fake@#{URI.parse(connection.base_url.to_s).host}"
  end

  def scope_key
    "scope=#{settings['scope']}"
  end

  def test_connection
    started = Time.current
    count = http.get('status').json.fetch('count')
    check = Check.new(name: 'status', ok: true, detail: "#{count} records")
    TestResult.new(ok: true, checks: [check], sample_count: count, latency_ms: ((Time.current - started) * 1000).round)
  end

  def each_page(checkpoint: nil, since: nil)
    yield Page.new(records: [], checkpoint: checkpoint, complete: since.nil?)
  end

  def fetch(external_id)
    raise InventoryIntegration::Errors::NotFound, external_id
  end
end
