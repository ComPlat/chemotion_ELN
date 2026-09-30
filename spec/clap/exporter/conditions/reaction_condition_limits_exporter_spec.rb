# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::ReactionConditionLimitsExporter do
  subject(:limits_export) { described_class.new(workup).to_clap }

  let(:workup) do
    {
      'duration' => 30_000,
      'TEMPERATURE' => { 'value' => '40', 'unit' => 'CELSIUS', 'additional_information' => 'OIL_BATH' },
    }
  end

  it 'exports duration and nested conditions' do
    expect(limits_export.to_h).to eq(
      duration: { value: 30.0, unit: :SECOND },
      conditions: {
        temperature_control: {
          temperature: { value: 40.0, unit: :CELSIUS },
          temperature_control_type: :OIL_BATH,
        },
      },
    )
  end
end
