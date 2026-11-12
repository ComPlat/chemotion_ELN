# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::Connection do
  let(:connection) { create(:inventory_connection) }

  it 'counts as tested only while nothing the test depends on changed' do
    connection.update!(last_test_ok: true, last_test_digest: connection.test_digest)
    expect(connection).to be_tested
    connection.settings = { 'scope' => 'other' }
    expect(connection).not_to be_tested
  end

  it 'keeps the test digest when the database reorders setting keys' do
    connection.update!(settings: { 'page_size' => 50, 'scope' => 'lab' })
    digest = connection.test_digest
    expect(described_class.find(connection.id).test_digest).to eq digest
  end

  it 'refuses a second current connection to the same source and scope' do
    twin = build(:inventory_connection, source_key: connection.source_key, scope_key: connection.scope_key)
    expect(twin).not_to be_valid
    connection.update!(archived_at: Time.current, status: 'archived')
    expect(twin).to be_valid
  end

  it 'checks field authority groups and values' do
    connection.field_authority = { 'stock' => 'external', 'colour' => 'external', 'notes' => 'both' }
    expect(connection.tap(&:valid?).errors[:field_authority].size).to eq 2
  end

  it 'allows every sharee unless the admin restricted them' do
    expect(connection.sharee_allowed?(42)).to be true
    connection.allowed_sharee_ids = [7]
    expect([connection.sharee_allowed?(7), connection.sharee_allowed?(42)]).to eq [true, false]
  end

  it 'keeps the credential ciphertext out of its history' do
    connection.update!(credentials_ciphertext: 'v1:sealed-text', name: 'renamed')
    history = described_class.with_log_data.find(connection.id).log_data
    expect(history.to_json).to include('renamed')
    expect(history.to_json).not_to include('sealed-text')
  end
end
