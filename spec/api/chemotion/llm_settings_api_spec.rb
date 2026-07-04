# frozen_string_literal: true

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
    context 'creating new settings' do
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

    context 'updating existing settings' do
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
      before { Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: []) }
      after  { Matrice.find_by(name: 'aiUserApiKey')&.destroy }

      it 'rejects switching to a custom provider with 403' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'custom', base_url: 'https://x.example.com/api' }.to_json,
            headers: headers

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the institution provider is not permitted (SF-03 gate)' do
      before { Matrice.find_or_create_by(name: 'aiGlobalProvider').update!(enabled: false, include_ids: [], exclude_ids: []) }
      after  { Matrice.find_by(name: 'aiGlobalProvider')&.destroy }

      it 'rejects switching to the institution provider with 403' do
        put '/api/v1/users/llm_settings',
            params: { provider_type: 'global' }.to_json,
            headers: headers

        expect(response).to have_http_status(:forbidden)
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
            body:   { choices: [{ message: { content: 'OK' } }] }.to_json,
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
