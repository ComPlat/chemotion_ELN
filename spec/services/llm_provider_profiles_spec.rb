# frozen_string_literal: true

# rubocop:disable RSpec/MultipleExpectations -- these assert one API response as a whole

require 'rails_helper'

RSpec.describe LlmProviderProfiles do
  describe '.all' do
    it 'loads validated profiles from the config file' do
      profiles = described_class.all
      expect(profiles).to be_an(Array)
      keys = profiles.pluck(:key)
      expect(keys).to include('anthropic', 'gemini')

      anthropic = profiles.find { |p| p[:key] == 'anthropic' }
      expect(anthropic[:protocol]).to eq('anthropic')
      expect(anthropic[:label]).to be_present
    end

    it 'exposes an optional curated models list' do
      anthropic = described_class.all.find { |p| p[:key] == 'anthropic' }
      expect(anthropic[:models]).to be_an(Array)
      expect(anthropic[:models]).to include('claude-opus-4-8')
    end

    it 'returns [] when the config file is absent (safe fallback)' do
      allow(File).to receive(:exist?).and_call_original
      allow(File).to receive(:exist?).with(described_class::CONFIG_PATH).and_return(false)
      expect(described_class.all).to eq([])
    end

    it 'returns [] on a malformed config file (safe fallback)' do
      allow(File).to receive(:exist?).and_call_original
      allow(File).to receive(:exist?).with(described_class::CONFIG_PATH).and_return(true)
      allow(File).to receive(:read).and_call_original
      allow(File).to receive(:read).with(described_class::CONFIG_PATH).and_return("\tnot: valid: yaml:")
      expect(described_class.all).to eq([])
    end

    it 'normalises an unknown protocol to openai' do
      allow(File).to receive(:exist?).and_call_original
      allow(File).to receive(:exist?).with(described_class::CONFIG_PATH).and_return(true)
      allow(File).to receive(:read).and_call_original
      allow(File).to receive(:read).with(described_class::CONFIG_PATH)
                                   .and_return({ 'profiles' => [{ 'key' => 'x', 'label' => 'X',
                                                                  'protocol' => 'bogus' }] }.to_yaml)
      # .all reads the YAML config; it is not an ActiveRecord relation.
      # rubocop:disable Rails/RedundantActiveRecordAllMethod
      expect(described_class.all.first[:protocol]).to eq('openai')
      # rubocop:enable Rails/RedundantActiveRecordAllMethod
    end
  end
end
# rubocop:enable RSpec/MultipleExpectations
