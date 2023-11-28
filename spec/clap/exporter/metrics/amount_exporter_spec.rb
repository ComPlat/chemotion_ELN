# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::AmountExporter do
  subject(:amount_export) { described_class.new(workup).to_clap }

  context 'with a volume amount' do
    let(:workup) { { 'value' => 2, 'unit' => 'ml' } }

    it 'exports volume amounts' do
      expect(amount_export.volume.to_h).to eq(value: 2.0, unit: :MILLILITER)
    end
  end

  context 'with a mass amount' do
    let(:workup) { { 'value' => 3, 'unit' => 'mg' } }

    it 'exports mass amounts' do
      expect(amount_export.mass.to_h).to eq(value: 3.0, unit: :MILLIGRAM)
    end
  end

  context 'with a moles amount' do
    let(:workup) { { 'value' => 4, 'unit' => 'mmol' } }

    it 'exports moles amounts' do
      expect(amount_export.moles.to_h).to eq(value: 4.0, unit: :MILLIMOLE)
    end
  end

  context 'with a percentage amount' do
    let(:workup) { { 'value' => 5, 'unit' => 'PERCENT' } }

    it 'exports percentage amounts' do
      expect(amount_export.percentage.to_h).to eq(value: 5.0)
    end
  end

  context 'without an amount' do
    let(:workup) { nil }

    it 'returns nil' do
      expect(amount_export).to be_nil
    end
  end
end
