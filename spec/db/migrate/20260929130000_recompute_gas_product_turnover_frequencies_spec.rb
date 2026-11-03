# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20260929130000_recompute_gas_product_turnover_frequencies.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260929130000: recompute gas product turnover frequencies' do
  let(:reaction) { create(:reaction) }

  def gas_phase_data(ton:, time:, tof:)
    {
      'time' => time,
      'temperature' => { 'unit' => 'K', 'value' => 298 },
      'part_per_million' => 500,
      'turnover_number' => ton,
      'turnover_frequency' => tof,
    }
  end

  def product_row(gas_type:, data:)
    ReactionsProductSample.create!(
      reaction: reaction, sample: create(:sample), gas_type: gas_type, gas_phase_data: data,
    )
  end

  def tof_of(row)
    row.reload.gas_phase_data['turnover_frequency']
  end

  before { reaction }

  it 'rewrites a TOF left wrong by a unit switch' do
    # 12 turnovers in 2 h are 0.1 TON/m; the old unit switch had stored 6 TON/h as 360 TON/m.
    row = product_row(
      gas_type: 'gas',
      data: gas_phase_data(ton: 12, time: { 'unit' => 'h', 'value' => 2 },
                           tof: { 'unit' => 'TON/m', 'value' => 360 }),
    )

    RecomputeGasProductTurnoverFrequencies.new.up

    expect(tof_of(row)['unit']).to eq('TON/m')
    expect(tof_of(row)['value']).to be_within(1e-12).of(0.1)
  end

  it 'converts between the time units of time and TOF' do
    row = product_row(
      gas_type: 'gas',
      data: gas_phase_data(ton: 6, time: { 'unit' => 'm', 'value' => 30 },
                           tof: { 'unit' => 'TON/s', 'value' => 1 }),
    )

    RecomputeGasProductTurnoverFrequencies.new.up

    expect(tof_of(row)['value']).to be_within(1e-12).of(6.0 / 1800)
  end

  it 'leaves a correct TOF alone' do
    row = product_row(
      gas_type: 'gas',
      data: gas_phase_data(ton: 12, time: { 'unit' => 'h', 'value' => 2 },
                           tof: { 'unit' => 'TON/h', 'value' => 6 }),
    )

    expect { RecomputeGasProductTurnoverFrequencies.new.up }.not_to(change { row.reload.updated_at })
    expect(tof_of(row)).to eq('unit' => 'TON/h', 'value' => 6)
  end

  it 'leaves rows it cannot recompute, and materials that are not gas products, alone' do
    no_time = product_row(
      gas_type: 'gas',
      data: gas_phase_data(ton: 12, time: { 'unit' => 'h', 'value' => nil },
                           tof: { 'unit' => 'TON/h', 'value' => 360 }),
    )
    not_gas = product_row(
      gas_type: 'off',
      data: gas_phase_data(ton: 12, time: { 'unit' => 'h', 'value' => 2 },
                           tof: { 'unit' => 'TON/h', 'value' => 360 }),
    )

    RecomputeGasProductTurnoverFrequencies.new.up

    expect(tof_of(no_time)['value']).to eq(360)
    expect(tof_of(not_gas)['value']).to eq(360)
  end
end
# rubocop:enable RSpec/DescribeClass
