# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmProviderProfiles do
  describe '.all' do
    it 'loads validated profiles from the config file' do
      profiles = described_class.all
      expect(profiles).to be_an(Array)
      keys = profiles.map { |p| p[:key] }
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
                                   .and_return({ 'profiles' => [{ 'key' => 'x', 'label' => 'X', 'protocol' => 'bogus' }] }.to_yaml)
      expect(described_class.all.first[:protocol]).to eq('openai')
    end
  end
end
