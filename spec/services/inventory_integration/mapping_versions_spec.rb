# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::MappingVersions do
  let(:connection) { create(:inventory_connection) }
  let(:admin) { connection.created_by }
  let(:service) { described_class.new(connection, actor: admin) }
  let(:mapping) { FakeInventoryAdapter::PRESET }

  it 'drafts a version with its validation report' do
    version = service.draft!(mapping: mapping.merge('fields' => { 'colour' => { 'from' => 'c' } }))
    expect(version).to have_attributes(status: 'draft', origin: 'manual')
    expect(version.validation_report).to include('valid' => false)
  end

  it 'accepts a valid draft, superseding the active one and requiring a dry run' do
    first = service.accept!(service.draft!(mapping: mapping))
    connection.update!(dry_run_required: false)
    second = service.accept!(service.draft!(mapping: mapping, based_on: first))
    expect(first.reload.status).to eq 'superseded'
    expect(second).to have_attributes(status: 'active', accepted_by: admin)
    expect(connection.reload).to have_attributes(active_mapping_version: second, dry_run_required: true)
  end

  it 'refuses to accept an invalid draft or a version that is no draft' do
    invalid = service.draft!(mapping: mapping.merge('fields' => { 'colour' => { 'from' => 'c' } }))
    expect { service.accept!(invalid) }.to raise_error(InventoryIntegration::Errors::ConfigurationError, /colour/)
    service.discard!(invalid)
    expect { service.accept!(invalid) }.to raise_error(InventoryIntegration::Errors::ConfigurationError, /only a draft/)
  end

  it "drafts the adapter's built-in mapping as a preset" do
    expect(service.draft_preset!(FakeInventoryAdapter)).to have_attributes(origin: 'preset', preset_key: 'fake@1.0.0')
  end
end
