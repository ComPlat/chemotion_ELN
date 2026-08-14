# frozen_string_literal: true

# rubocop:disable RSpec/MultipleExpectations -- these assert one API response as a whole

require 'rails_helper'

describe Chemotion::LlmSettingsAPI do
  include_context 'api request authorization context'

  let(:headers) { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }

  describe 'GET /api/v1/users/llm_settings' do
    context 'when the user has no settings saved yet' do
      it 'returns global defaults' do
        get '/api/v1/users/llm_settings', headers: headers

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['setting']['provider_type']).to eq('global')
        expect(body['setting']['enabled']).to be true
        expect(body['task_mappings']).to eq([])
      end
    end

    context 'when the user has saved settings' do
      before do
        create(:user_llm_setting, user: user, api_key: 'sk-secret-9999')
        create(:user_task_model_mapping, user: user, task_name: 'sds_extraction', model: 'gpt-4')
      end

      it 'returns the settings with a masked API key' do
        get '/api/v1/users/llm_settings', headers: headers

        body = JSON.parse(response.body)
        expect(body['setting']['provider_type']).to eq('custom')
        expect(body['setting']['api_key_masked']).to match(/sk-•+\d{4}/)
        # full plaintext key must not be exposed
        expect(body['setting']['api_key_masked']).not_to include('secret')
      end

      it 'returns task model mappings' do
        get '/api/v1/users/llm_settings', headers: headers

        body = JSON.parse(response.body)
        expect(body['task_mappings']).to include(
          { 'task_name' => 'sds_extraction', 'model' => 'gpt-4' },
        )
      end
    end
  end

  describe 'PUT /api/v1/users/llm_settings' do
    context 'when creating new settings' do
      let(:payload) do
        {
          provider_type: 'custom',
          base_url:      'https://ki-toolbox.scc.kit.edu/api',
          api_key:       'sk-new-key-1234',
          default_model: 'kit.qwen3.5-397b-A17b',
          task_mappings: [{ task_name: 'sds_extraction', model: 'gpt-4' }],
        }
      end

      it 'creates the settings record' do
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['success']).to be true
      end

      it 'persists the encrypted API key' do
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        setting = user.reload.user_llm_setting
        expect(setting.api_key).to eq('sk-new-key-1234')
      end

      it 'persists task model mappings' do
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        mapping = user.user_task_model_mappings.find_by(task_name: 'sds_extraction')
        expect(mapping).not_to be_nil
        expect(mapping.model).to eq('gpt-4')
      end
    end

    context 'when updating existing settings' do
      before do
        create(:user_llm_setting, user: user)
        create(:user_task_model_mapping, user: user, task_name: 'sds_extraction', model: 'old-model')
      end

      it 'updates the provider_type' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'global' }.to_json,
            headers: headers

        expect(user.reload.user_llm_setting.provider_type).to eq('global')
      end

      it 'overwrites an existing task mapping' do
        payload = { task_mappings: [{ task_name: 'sds_extraction', model: 'new-model' }] }
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        mapping = user.user_task_model_mappings.find_by(task_name: 'sds_extraction')
        expect(mapping.model).to eq('new-model')
      end

      it 'removes a task mapping when model is blank' do
        payload = { task_mappings: [{ task_name: 'sds_extraction', model: '' }] }
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        expect(user.user_task_model_mappings.find_by(task_name: 'sds_extraction')).to be_nil
      end
    end

    context 'with invalid provider_type' do
      it 'returns 422' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'invalid_type' }.to_json,
            headers: headers

        expect(response).to have_http_status(:bad_request)
      end
    end

    context 'when personal API keys are not permitted (SF-03 gate)' do
      before do
        Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: [])
      end

      after { Matrice.find_by(name: 'aiUserApiKey')&.destroy }

      it 'rejects switching to a custom provider with 403' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'custom', base_url: 'https://x.example.com/api' }.to_json,
            headers: headers

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the institution provider is not permitted (SF-03 gate)' do
      before do
        Matrice.find_or_create_by(name: 'aiGlobalProvider').update!(enabled: false, include_ids: [], exclude_ids: [])
      end

      after { Matrice.find_by(name: 'aiGlobalProvider')&.destroy }

      it 'rejects switching to the institution provider with 403' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'global' }.to_json,
            headers: headers

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'with a cached model catalogue for the saved provider' do
      let(:old_url)    { 'https://old-endpoint.example/api' }
      let(:new_url)    { 'https://new-endpoint.example/api' }
      let(:old_models) { "#{old_url}/v1/models" }
      let(:new_models) { "#{new_url}/v1/models" }

      before do
        create(:user_llm_setting, user: user, base_url: old_url, api_key: 'sk-old-key')
        stub_request(:get, old_models).to_return(
          status:  200,
          body:    { 'data' => [{ 'id' => 'old-model' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        stub_request(:get, new_models).to_return(
          status:  200,
          body:    { 'data' => [{ 'id' => 'new-model' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        # Warm the cache for the identity the user is about to move away from
        # (blank api_key → the endpoint reuses the saved one).
        post '/api/v1/users/llm_settings/models',
             params:  { base_url: old_url }.to_json,
             headers: headers
      end

      it 'has the old provider’s catalogue cached to begin with' do
        expect(JSON.parse(response.body)['models']).to eq(['old-model'])
      end

      it 'drops the catalogue of the identity it moved away from' do
        put '/api/v1/users/llm_settings',
            params:  { provider_type: 'custom', base_url: new_url, api_key: 'sk-new-key' }.to_json,
            headers: headers
        expect(response).to have_http_status(:ok)

        # Point back at the old endpoint: without invalidation this would still be
        # served from the pre-change cache entry.
        post '/api/v1/users/llm_settings/models',
             params:  { base_url: old_url, api_key: 'sk-old-key' }.to_json,
             headers: headers

        expect(WebMock).to have_requested(:get, old_models).twice
      end

      it 'lists the new provider’s models after the switch' do
        put '/api/v1/users/llm_settings',
            params:  { provider_type: 'custom', base_url: new_url, api_key: 'sk-new-key' }.to_json,
            headers: headers

        post '/api/v1/users/llm_settings/models',
             params:  { base_url: new_url, api_key: 'sk-new-key' }.to_json,
             headers: headers

        expect(JSON.parse(response.body)['models']).to eq(['new-model'])
      end
    end

    describe 'POST /api/v1/users/llm_settings/models' do
      let(:base_url)   { 'https://ki-toolbox.scc.kit.edu/api' }
      let(:models_url) { "#{base_url}/v1/models" }

      before do
        create(:user_llm_setting, user: user, base_url: base_url, api_key: 'sk-mine')
        stub_request(:get, models_url).to_return(
          status:  200,
          body:    { 'data' => [{ 'id' => 'kit.llama3' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
      end

      it 'serves a repeat lookup from the cache' do
        2.times do
          post '/api/v1/users/llm_settings/models', params: { base_url: base_url }.to_json, headers: headers
        end

        expect(JSON.parse(response.body)['models']).to eq(['kit.llama3'])
        expect(WebMock).to have_requested(:get, models_url).once
      end

      it 'reuses the saved key when the form leaves it blank' do
        post '/api/v1/users/llm_settings/models', params: { base_url: base_url }.to_json, headers: headers

        expect(WebMock).to have_requested(:get, models_url)
          .with(headers: { 'Authorization' => 'Bearer sk-mine' }).once
      end

      it 're-reads the catalogue when the caller asks for a refresh' do
        post '/api/v1/users/llm_settings/models', params: { base_url: base_url }.to_json, headers: headers
        post '/api/v1/users/llm_settings/models',
             params:  { base_url: base_url, refresh: true }.to_json,
             headers: headers

        expect(WebMock).to have_requested(:get, models_url).twice
      end
    end
  end

  describe 'POST /api/v1/users/llm_settings/verify' do
    context 'when a global provider is configured' do
      before do
        create(:llm_provider)
        stub_request(:post, 'https://ki-toolbox.scc.kit.edu/api/v1/chat/completions')
          .to_return(
            status: 200,
            body: { choices: [{ message: { content: 'OK' } }] }.to_json,
            headers: { 'Content-Type' => 'application/json' },
          )
      end

      it 'returns success: true' do
        post '/api/v1/users/llm_settings/verify', params: {}.to_json, headers: headers

        expect(response).to have_http_status(:success)
        body = JSON.parse(response.body)
        expect(body['success']).to be true
      end
    end

    context 'when no LLM provider is configured' do
      it 'returns 422' do
        post '/api/v1/users/llm_settings/verify', params: {}.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context 'when the API key is invalid' do
      before do
        create(:llm_provider)
        stub_request(:post, 'https://ki-toolbox.scc.kit.edu/api/v1/chat/completions')
          .to_return(status: 401, body: 'Unauthorized')
      end

      it 'returns 401' do
        post '/api/v1/users/llm_settings/verify', params: {}.to_json, headers: headers

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'DELETE /api/v1/users/llm_settings/api_key' do
    before { create(:user_llm_setting, user: user, api_key: 'sk-secret-9999') }

    it 'removes the saved personal API key' do
      delete '/api/v1/users/llm_settings/api_key', headers: headers

      expect(response).to have_http_status(:success)
      expect(user.reload.user_llm_setting.api_key).to be_nil
    end
  end
end
# rubocop:enable RSpec/MultipleExpectations
