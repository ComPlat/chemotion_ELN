# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::Contract do
  def fixture(name)
    JSON.parse(Rails.root.join('spec/fixtures/inventory_integration/contract', name).read)
  end

  let(:minimal) { fixture('valid/minimal_cas_only.json') }

  Rails.root.glob('spec/fixtures/inventory_integration/contract/valid/*.json').each do |path|
    it "accepts #{path.basename}" do
      expect(described_class.validate(JSON.parse(path.read))).to be_empty
    end
  end

  {
    'missing_external_id.json' => %w[contract.invalid /external_id],
    'bad_cas_check_digit.json' => %w[contract.pattern /substance/cas],
    'unit_kg_uppercase.json' => %w[contract.unit_unknown /quantity/remaining/unit],
    'bad_h_code.json' => %w[contract.pattern /hazard/h_statements/0],
  }.each do |file, (code, path)|
    it "rejects #{file} with #{code}" do
      errors = described_class.validate(fixture("invalid/#{file}"))
      expect(errors.map { |error| [error.code, error.path] }).to eq [[code, path]]
    end
  end

  it 'requires a name or a CAS number for the substance' do
    record = minimal.merge('substance' => { 'smiles' => 'O' })
    expect(described_class.validate(record).map(&:path)).to eq ['/substance']
  end

  it 'refuses provenance only from external callers' do
    record = minimal.merge('provenance' => { 'run_id' => 1 })
    expect(described_class.validate(record)).to be_empty
    expect(described_class.validate(record, inbound: true).map(&:path)).to eq ['/provenance']
  end

  it 'limits extensions to 16 KB' do
    record = minimal.merge('extensions' => { 'goechem' => { 'blob' => 'x' * 17_000 } })
    expect(described_class.validate(record).map(&:path)).to eq ['/extensions']
  end

  it 'checks the CAS check digit' do
    expect(described_class.valid_cas?('7732-18-5')).to be true
    expect(described_class.valid_cas?('7732-18-4')).to be false
  end

  it 'lists the leaf fields a mapping may write, without engine fields' do
    expect(described_class.target_paths).to include('substance.cas', 'quantity.remaining.unit', 'location.path')
    expect(described_class.target_paths).not_to include('contract', 'version', 'provenance', 'quantity.remaining')
  end
end
