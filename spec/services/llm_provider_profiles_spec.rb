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

  describe '.models_for' do
    it 'returns the curated list configured for that endpoint' do
      models = described_class.models_for(base_url: 'https://api.openai.com', protocol: 'openai')
      expect(models).to include('gpt-4o', 'o3')
    end

    it 'ignores an insignificant trailing slash' do
      expect(described_class.models_for(base_url: 'https://api.openai.com/', protocol: 'openai'))
        .to eq(described_class.models_for(base_url: 'https://api.openai.com', protocol: 'openai'))
    end

    it 'returns [] for an endpoint the config says nothing about' do
      expect(described_class.models_for(base_url: 'https://unknown.example/api', protocol: 'openai')).to eq([])
    end

    it 'returns [] when the protocol does not match the profile' do
      expect(described_class.models_for(base_url: 'https://api.openai.com', protocol: 'anthropic')).to eq([])
    end

    it 'returns [] for a profile that curates no models' do
      # kit_toolbox ships without a `models:` list, so its live catalogue is used.
      expect(described_class.models_for(base_url: 'https://ki-toolbox.scc.kit.edu/api')).to eq([])
    end
  end
end
# rubocop:enable RSpec/MultipleExpectations
