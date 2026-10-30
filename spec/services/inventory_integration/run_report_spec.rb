# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::RunReport do
  let(:report) { described_class.new(run: { id: 1, adapter: 'fake', status: 'running' }) }

  it 'produces a report that matches its schema' do
    report.increment(:seen, 3)
    report.add_error('contract.unit_unknown', "unit 'X' has no mapping", external_id: 'a', value: 'X')
    report.add_warning('substance.unresolved_cas', example: '000-00-0')
    expect(described_class.schema.validate(report.to_h)).to be_empty
  end

  it 'counts every error but keeps at most 200 in detail' do
    201.times { |i| report.add_error('mapping.path_missing', 'missing', external_id: i.to_s) }
    data = report.to_h
    expect(data['counts']['errors']).to eq 201
    expect(data['errors'].size).to eq 200
    expect(data['error_summary']).to eq [{ 'code' => 'mapping.path_missing', 'count' => 201 }]
  end

  it 'keeps at most five examples per warning' do
    7.times { |i| report.add_warning('substance.unresolved_cas', example: "cas-#{i}") }
    expect(report.to_h['warnings'].first).to include('count' => 7, 'examples' => %w[cas-0 cas-1 cas-2 cas-3 cas-4])
  end

  it 'resumes from a stored report' do
    report.increment(:created)
    resumed = described_class.from_h(JSON.parse(report.to_h.to_json))
    resumed.increment(:created)
    expect(resumed.to_h['counts']['created']).to eq 2
  end

  it 'refuses unknown counts' do
    expect { report.increment(:imported) }.to raise_error(ArgumentError, /imported/)
  end
end
