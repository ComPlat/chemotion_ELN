# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmModelCatalog do
  let(:base_url) { 'https://ki-toolbox.scc.kit.edu/api' }
  let(:api_key)  { 'sk-test-key' }
  let(:models_url) { "#{base_url}/v1/models" }

  let(:models_body) do
    { 'data' => [{ 'id' => 'kit.qwen3.5-397b-A17b' }, { 'id' => 'kit.llama3' }] }.to_json
  end

  before do
    described_class.clear!
    stub_request(:get, models_url)
      .to_return(status: 200, body: models_body, headers: { 'Content-Type' => 'application/json' })
  end

  after { described_class.clear! }

  describe '.fetch' do
    it 'returns the provider model list' do
      models = described_class.fetch(base_url: base_url, api_key: api_key)

      expect(models).to contain_exactly('kit.qwen3.5-397b-A17b', 'kit.llama3')
    end

    it 'calls the provider only once for repeated lookups' do
      3.times { described_class.fetch(base_url: base_url, api_key: api_key) }

      expect(WebMock).to have_requested(:get, models_url).once
    end

    it 'ignores an insignificant trailing slash on the endpoint' do
      described_class.fetch(base_url: base_url, api_key: api_key)
      described_class.fetch(base_url: "#{base_url}/", api_key: api_key)

      expect(WebMock).to have_requested(:get, models_url).once
    end

    it 'calls the provider again when forced' do
      described_class.fetch(base_url: base_url, api_key: api_key)
      described_class.fetch(base_url: base_url, api_key: api_key, force: true)

      expect(WebMock).to have_requested(:get, models_url).twice
    end

    it 'does not serve one key’s catalogue to another key' do
      other_body = { 'data' => [{ 'id' => 'private-model' }] }.to_json
      described_class.fetch(base_url: base_url, api_key: api_key)
      stub_request(:get, models_url)
        .to_return(status: 200, body: other_body, headers: { 'Content-Type' => 'application/json' })

      models = described_class.fetch(base_url: base_url, api_key: 'sk-someone-else')

      expect(models).to eq(['private-model'])
    end

    it 'keeps catalogues of different endpoints apart' do
      other_url = 'https://vllm.example.org'
      stub_request(:get, "#{other_url}/v1/models")
        .to_return(status: 200,
                   body: { 'data' => [{ 'id' => 'gpt-4o' }] }.to_json,
                   headers: { 'Content-Type' => 'application/json' })

      described_class.fetch(base_url: base_url, api_key: api_key)

      expect(described_class.fetch(base_url: other_url, api_key: api_key)).to eq(['gpt-4o'])
    end

    it 'does not cache an empty result, so a fixed config is picked up at once' do
      stub_request(:get, models_url).to_return(status: 401, body: '{}')
      expect(described_class.fetch(base_url: base_url, api_key: 'bad')).to eq([])

      stub_request(:get, models_url)
        .to_return(status: 200, body: models_body, headers: { 'Content-Type' => 'application/json' })

      expect(described_class.fetch(base_url: base_url, api_key: 'bad'))
        .to contain_exactly('kit.qwen3.5-397b-A17b', 'kit.llama3')
    end

    context 'when the config names models for the endpoint' do
      # config/llm_provider_profiles.yml ships a list for api.openai.com.
      let(:configured_url) { 'https://api.openai.com' }

      it 'prefers what the provider itself lists' do
        stub_request(:get, "#{configured_url}/v1/models").to_return(
          status: 200,
          body: { 'data' => [{ 'id' => 'gpt-5-live' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )

        expect(described_class.fetch(base_url: configured_url, api_key: api_key)).to eq(['gpt-5-live'])
      end

      it 'falls back to the configured list when the provider lists nothing' do
        stub_request(:get, "#{configured_url}/v1/models").to_return(status: 404, body: '{}')

        expect(described_class.fetch(base_url: configured_url, api_key: api_key)).to include('gpt-4o', 'o3')
      end

      it 'does not cache the fallback, so a provider that starts listing takes over' do
        stub_request(:get, "#{configured_url}/v1/models").to_return(status: 404, body: '{}')
        described_class.fetch(base_url: configured_url, api_key: api_key)

        stub_request(:get, "#{configured_url}/v1/models").to_return(
          status: 200,
          body: { 'data' => [{ 'id' => 'gpt-5-live' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )

        expect(described_class.fetch(base_url: configured_url, api_key: api_key)).to eq(['gpt-5-live'])
      end
    end
  end

  describe '.invalidate' do
    it 'drops the cached catalogue for that provider' do
      described_class.fetch(base_url: base_url, api_key: api_key)
      described_class.invalidate(base_url: base_url, api_key: api_key)
      described_class.fetch(base_url: base_url, api_key: api_key)

      expect(WebMock).to have_requested(:get, models_url).twice
    end
  end
end
