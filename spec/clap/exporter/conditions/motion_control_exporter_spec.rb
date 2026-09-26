# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Conditions::MotionControlExporter do
  subject(:motion_control_export) { described_class.new(workup).to_clap }

  let(:workup) { { motion_type: 'STIR_BAR', speed: { value: 10 } }.deep_stringify_keys }

  it 'exports motion type' do
    expect(motion_control_export.to_h).to include({ type: :STIR_BAR })
  end

  it 'exports speed' do
    expect(motion_control_export.to_h).to include({ speed: { value: 10.0, unit: :RPM } })
  end

  context 'with incomplete motion data' do
    let(:workup) { { motion_type: 'unknown', speed: nil }.deep_stringify_keys }

    it 'exports motion type :UNSPECIFIED' do
      expect(motion_control_export.type).to eq(:UNSPECIFIED)
    end

    it 'exports speed 0' do
      expect(motion_control_export.to_h).to include({ speed: { value: 0.0, unit: :RPM } })
    end
  end
end
