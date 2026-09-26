# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::IrradiationControlExporter do
  subject(:control_export) do
    described_class.new(workup).to_clap
  end

  let(:workup) do
    { 'value' => '365',
      'unit' => 'NM',
      'power_is_ramp' => true,
      'power' => { 'value' => '100', 'unit' => 'WATT' },
      'power_end' => { 'value' => '200', 'unit' => 'WATT' } }
  end

  it 'exports irradiation' do
    expect(control_export.to_h).to include({ peak_wavelength: { unit: :NANOMETER, value: 365.0 },
                                             power: { value: 100, unit: :WATT },
                                             power_end: { value: 200, unit: :WATT },
                                             power_is_ramp: true })
  end

  context 'with non-ramp power' do
    let(:workup) { { 'power_is_ramp' => false } }

    it 'omits power_end for non-ramp power' do
      expect(control_export.power_end).to be_nil
    end
  end
end
