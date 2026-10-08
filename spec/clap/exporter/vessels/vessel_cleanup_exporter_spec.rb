# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::VesselCleanupExporter do
  subject(:cleanup_export) { described_class.new(build(:reaction_process_vessel, cleanup: cleanup)).to_clap }

  let(:cleanup) { 'WASTE' }

  it 'exports cleanup type' do
    expect(cleanup_export.type).to eq(:WASTE)
  end

  context 'with storage cleanup' do
    let(:cleanup) { 'STORAGE' }

    it 'exports storage cleanup type' do
      expect(cleanup_export.to_h).to eq(type: :STORAGE)
    end
  end

  context 'with unknown cleanup' do
    let(:cleanup) { 'UNKNOWN' }

    it 'falls back for unknown cleanup types' do
      expect(cleanup_export.type).to eq(:UNSPECIFIED)
    end
  end
end
