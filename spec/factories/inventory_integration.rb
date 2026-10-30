# frozen_string_literal: true

FactoryBot.define do
  factory :inventory_managed_collection, class: 'InventoryIntegration::ManagedCollection' do
    collection { create(:collection, user: create(:person)) }
    created_by { create(:admin) }
  end

  factory :inventory_connection, class: 'InventoryIntegration::Connection' do
    managed_collection { create(:inventory_managed_collection) }
    adapter_key { 'fake' }
    sequence(:name) { |n| "Connection #{n}" }
    base_url { 'https://inv.example.org/api' }
    sequence(:source_key) { |n| "fake@host-#{n}.example.org" }
    scope_key { 'scope=lab' }
    created_by { managed_collection.created_by }
  end

  factory :inventory_mapping_version, class: 'InventoryIntegration::MappingVersion' do
    connection { create(:inventory_connection) }
    origin { 'manual' }
    mapping { JSON.parse(Rails.root.join('spec/fixtures/inventory_integration/mapping/example.json').read) }
    created_by { connection.created_by }
  end
end
