# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::VesselTypeExporter do
  subject(:vessel_type_export) do
    described_class.new(build(:vessel_template, vessel_type: vessel_type)).to_clap
  end

  let(:vessel_type) { 'VIAL' }

  it 'exports known vessel types' do
    expect(vessel_type_export).to eq(Clap::VesselTemplate::VesselType::VIAL)
  end

  context 'with multi-word vessel type' do
    let(:vessel_type) { 'round_bottom_flask' }

    it 'exports enum values with underscores' do
      expect(vessel_type_export).to eq(Clap::VesselTemplate::VesselType::ROUND_BOTTOM_FLASK)
    end
  end

  context 'with an unknown vessel type' do
    let(:vessel_type) { 'round bottom flask' }

    it 'falls back for unknown vessel types' do
      expect(vessel_type_export).to eq(Clap::VesselTemplate::VesselType::UNSPECIFIED)
    end
  end
end
