# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::VesselPreparationsExporter do
  subject(:preparations_export) { described_class.new(preparations).to_clap }

  let(:preparations) { %w[OVEN_DRIED FLAME_DRIED PURGED] }

  it 'exports known preparation types' do
    expect(preparations_export.map(&:to_h)).to eq(
      [{ type: :OVEN_DRIED }, { type: :FLAME_DRIED }, { type: :PURGED }],
    )
  end

  context 'without preparations' do
    let(:preparations) { nil }

    it 'exports :NONE' do
      expect(preparations_export.map(&:to_h)).to eq([{ type: :NONE }])
    end
  end

  context 'with bad preparation data' do
    let(:preparations) { ['bad'] }

    it 'falls back for unknown preparations' do
      expect(preparations_export.map(&:to_h)).to eq([{}])
    end
  end
end
