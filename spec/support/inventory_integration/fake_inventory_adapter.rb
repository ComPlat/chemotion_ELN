# frozen_string_literal: true

# Smallest adapter that passes the registry checks, for specs of the integration core.
class FakeInventoryAdapter < InventoryIntegration::Adapters::Base
  def self.manifest
    {
      key: 'fake',
      name: 'Fake inventory',
      version: '1.0.0',
      contracts: [InventoryIntegration::Contract::ID],
      capabilities: %i[list fetch],
      change_detection: :snapshot,
      mapping: :required,
      settings_schema: {
        'type' => 'object',
        'properties' => {
          'scope' => { 'type' => 'string' },
          'api_key' => { 'type' => 'string', 'x-secret' => true },
        },
      },
    }
  end

  def each_page(checkpoint: nil, since: nil)
    yield Page.new(records: [], checkpoint: checkpoint, complete: since.nil?)
  end

  def fetch(external_id)
    raise InventoryIntegration::Errors::NotFound, external_id
  end
end
