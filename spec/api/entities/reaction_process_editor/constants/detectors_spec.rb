# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::Constants::Detectors do
  it 'defines DETECTOR_SETTINGS' do
    expect(Entities::ReactionProcessEditor::Constants::Detectors::DETECTOR_SETTINGS).to be_present
  end

  describe '.detector_settings' do
    it 'returns configured detector settings' do
      expect(described_class.detector_settings('CHMO:0001728')).to include('label' => 'PDA')
    end

    it 'falls back to generic detector settings' do
      expect(described_class.detector_settings('CHMO::UnknownId')).to eq(
        value: 'CHMO::UnknownId',
        label: 'CHMO::UnknownId',
        analysis_defaults: [{ label: 'none' }],
      )
    end
  end
end
