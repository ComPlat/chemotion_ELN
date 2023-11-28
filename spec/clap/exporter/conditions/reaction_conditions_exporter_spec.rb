# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::ReactionConditionsExporter do
  subject(:conditions_export) { described_class.new(workup).to_clap }

  let(:workup) do
    {
      'TEMPERATURE' => { 'value' => '21', 'unit' => 'CELSIUS', 'additional_information' => 'AMBIENT' },
      'PRESSURE' => { 'value' => '1013', 'unit' => 'MBAR' },
      'PH' => { 'value' => '7', 'additional_information' => 'PH_ELECTRODE' },
      'MOTION' => {
        'motion_type' => 'STIR_BAR',
        'speed' => { 'value' => '350' },
        'motion_mode' => 'NCIT:C70669',
      },
      'IRRADIATION' => {
        'value' => '365',
        'unit' => 'NM',
        'additional_information' => 'LED',
        'power' => { 'value' => '10', 'unit' => 'WATT' },
        'power_is_ramp' => true,
        'power_end' => { 'value' => '20', 'unit' => 'WATT' },
      },
      'WAVELENGTHS' => { 'is_range' => true, 'peaks' => [{ 'value' => '365', 'unit' => 'NM' }] },
      'MS_PARAMETER' => 'scan range',
    }
  end

  before do
    create(:ontology, ontology_id: 'NCIT:C70669', label: 'Automation', name: 'Automation mode')
  end

  it 'exports populated condition controls' do
    expect(conditions_export.to_h).to include(
      temperature_control: { temperature: { value: 21.0, unit: :CELSIUS }, temperature_control_type: :AMBIENT },
      pressure_control: { pressure: { value: 1013.0, unit: :MBAR } },
      ph_control: { ph: 7.0, measurement_type: :PH_ELECTRODE },
      motion_control: {
        type: :STIR_BAR,
        speed: { value: 350.0, unit: :RPM },
        motion_mode: { id: 'NCIT:C70669', label: 'Automation', name: 'Automation mode' },
      },
      irradiation_control: {
        type: :LED,
        peak_wavelength: { value: 365.0, unit: :NANOMETER },
        power: { value: 10.0, unit: :WATT },
        power_is_ramp: true,
        power_end: { value: 20.0, unit: :WATT },
      },
      wavelengths: { is_range: true, peaks: [{ value: 365.0, unit: :NANOMETER }] },
      generic: [{ name: 'MS_PARAMETER', conditions: 'scan range' }],
    )
  end

  context 'without condition workup' do
    let(:workup) { nil }

    it 'returns nil' do
      expect(conditions_export).to be_nil
    end
  end
end
