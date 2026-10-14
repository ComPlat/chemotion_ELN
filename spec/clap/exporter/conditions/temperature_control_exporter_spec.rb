# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::TemperatureControlExporter do
  subject(:control_export) { described_class.new(workup).to_clap }

  let(:workup) { { 'value' => '21', 'unit' => 'CELSIUS', 'additional_information' => 'OIL_BATH' } }

  it 'exports temperature' do
    expect(control_export.to_h).to include(temperature: { unit: :CELSIUS, value: 21.0 })
  end

  it 'exports additional_information' do
    expect(control_export.to_h).to include(temperature_control_type: :OIL_BATH)
  end

  context 'with bad additional_information' do
    let(:workup) { { 'value' => '21', 'unit' => 'CELSIUS', 'additional_information' => 'bad' } }

    it 'falls back for unknown temperature control types' do
      expect(control_export.temperature_control_type).to eq(:UNSPECIFIED)
    end
  end
end
