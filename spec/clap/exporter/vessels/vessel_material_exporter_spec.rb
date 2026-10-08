# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::VesselMaterialExporter do
  subject(:material_export) { described_class.new(build(:vessel_template, material_type: material_type)).to_clap }

  let(:material_type) { 'glass' }

  it 'exports material' do
    expect(material_export).to eq('GLASS')
  end

  context 'without material type' do
    let(:material_type) { nil }

    it 'returns nil' do
      expect(material_export).to be_nil
    end
  end
end
