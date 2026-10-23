# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::MappingVersion do
  let(:connection) { create(:inventory_connection) }

  it 'numbers the versions of a connection' do
    versions = Array.new(2) { create(:inventory_mapping_version, connection: connection) }
    expect(versions.map(&:version)).to eq [1, 2]
  end

  it 'freezes the mapping once the version is no longer a draft' do
    version = create(:inventory_mapping_version, connection: connection)
    version.update!(status: 'discarded')
    version.mapping = { 'schema' => 'changed' }
    expect(version).not_to be_valid
  end

  it 'cannot be active without acceptance, nor twice per connection' do
    version = create(:inventory_mapping_version, connection: connection)
    expect do
      described_class.transaction(requires_new: true) { version.update_columns(status: 'active') } # rubocop:disable Rails/SkipsModelValidations
    end.to raise_error(ActiveRecord::StatementInvalid, /active_accepted/)
    accepted = { status: 'active', accepted_by: connection.created_by, accepted_at: Time.current }
    version.reload.update!(accepted)
    expect { create(:inventory_mapping_version, connection: connection, **accepted) }
      .to raise_error(ActiveRecord::RecordNotUnique)
  end
end
