# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::PressureControlExporter do
  subject(:pressure_control_export) { described_class.new(workup).to_clap }

  let(:workup) { { 'value' => '15', 'unit' => 'MBAR' } }

  it 'exports pressure' do
    expect(pressure_control_export.to_h).to include(pressure: { unit: :MBAR, value: 15.0 })
  end

  context 'with blank pressure value' do
    let(:workup) { { 'value' => nil, 'unit' => 'MBAR' } }

    it 'omits pressure' do
      expect(pressure_control_export.pressure).to be_nil
    end
  end
end
