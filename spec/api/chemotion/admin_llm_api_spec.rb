# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminLlmAPI do
  let(:headers) { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }

  # ── Non-admin rejects ────────────────────────────────────────────────────────

  context 'when the current user is not an admin' do
    let(:regular_user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(regular_user)
    end

    it 'rejects with 401 on GET /api/v1/admin/llm_config' do
      get '/api/v1/admin/llm_config', headers: headers
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ── Admin context ────────────────────────────────────────────────────────────

  context 'when the current user is an admin' do
    let!(:admin) { create(:admin) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
    end

    describe 'GET /api/v1/admin/llm_config' do
      context 'when no provider exists' do
        it 'returns global_enabled false and empty include/exclude user arrays' do
          get '/api/v1/admin/llm_config', headers: headers

          expect(response).to have_http_status(:ok)
          body = JSON.parse(response.body)
          expect(body['global_enabled']).to be false
          expect(body['provider']).to be_nil
          expect(body['include_users']).to eq([])
          expect(body['exclude_users']).to eq([])
        end
      end

      context 'when a global provider exists' do
        let!(:provider) { create(:llm_provider, api_key: 'sk-admin-0000') }

        it 'returns the provider with masked API key' do
          get '/api/v1/admin/llm_config', headers: headers

          body = JSON.parse(response.body)
          expect(body['provider']['id']).to eq(provider.id)
          expect(body['provider']['api_key_masked']).to match(/sk-•+\d{4}/)
          expect(body['provider']['api_key_masked']).not_to include('admin')
          expect(body['provider']['base_url']).to eq(provider.base_url)
        end
      end

      context 'when aiFeatures Matrice is enabled' do
        before { Matrice.find_or_create_by(name: 'aiFeatures').update!(enabled: true) }
        after  { Matrice.find_by(name: 'aiFeatures')&.update!(enabled: false) }

        it 'returns global_enabled true' do
          get '/api/v1/admin/llm_config', headers: headers

          body = JSON.parse(response.body)
          expect(body['global_enabled']).to be true
        end
      end

      context 'when Matrice has include/exclude users' do
        let!(:person) { create(:person) }

        before do
          Matrice.find_or_create_by(name: 'aiFeatures').update!(
            enabled:     false,
            include_ids: [person.id],
          )
        end
        after { Matrice.find_by(name: 'aiFeatures')&.update!(include_ids: [], enabled: false) }

        it 'returns include_users with label' do
          get '/api/v1/admin/llm_config', headers: headers

          body = JSON.parse(response.body)
          expect(body['include_users'].first['value']).to eq(person.id)
        end
      end
    end

    describe 'PUT /api/v1/admin/llm_config' do
      before { Matrice.find_or_create_by(name: 'aiFeatures').update!(enabled: false, include_ids: [], exclude_ids: []) }
      after  { Matrice.find_by(name: 'aiFeatures')&.update!(enabled: false, include_ids: [], exclude_ids: []) }

      it 'toggles global_enabled on the aiFeatures Matrice' do
        put '/api/v1/admin/llm_config',
            params: { global_enabled: true }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        expect(Matrice.find_by(name: 'aiFeatures').enabled).to be true
      end

      it 'updates include_ids on the Matrice' do
        person = create(:person)
        put '/api/v1/admin/llm_config',
            params: { include_ids: [person.id] }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        expect(Matrice.find_by(name: 'aiFeatures').include_ids).to include(person.id)
      end

      it 'creates a global provider when none exists' do
        expect {
          put '/api/v1/admin/llm_config',
              params: {
                provider_name: 'Example AI',
                base_url:      'https://ai.example.com',
                api_key:       'sk-new-key-1234',
                default_model: 'gpt-4o',
              }.to_json,
              headers: headers
        }.to change(LlmProvider, :count).by(1)

        expect(response).to have_http_status(:ok)
        provider = LlmProvider.global_providers.first
        expect(provider.name).to eq('Example AI')
        expect(provider.base_url).to eq('https://ai.example.com')
        expect(provider.default_model).to eq('gpt-4o')
      end

      it 'toggles the aiUserApiKey (personal key) gate' do
        Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: [])
        put '/api/v1/admin/llm_config',
            params: { custom_key_enabled: true }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        expect(Matrice.find_by(name: 'aiUserApiKey').enabled).to be true
      ensure
        Matrice.find_by(name: 'aiUserApiKey')&.destroy
      end

      it 'toggles the aiGlobalProvider (institution) gate' do
        Matrice.find_or_create_by(name: 'aiGlobalProvider').update!(enabled: true, include_ids: [], exclude_ids: [])
        put '/api/v1/admin/llm_config',
            params: { institution_enabled: false }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        expect(Matrice.find_by(name: 'aiGlobalProvider').enabled).to be false
      ensure
        Matrice.find_by(name: 'aiGlobalProvider')&.destroy
      end

      it 'updates the existing global provider' do
        provider = create(:llm_provider)

        put '/api/v1/admin/llm_config',
            params: { default_model: 'gpt-4-turbo' }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        expect(provider.reload.default_model).to eq('gpt-4-turbo')
      end
    end

    describe 'POST /api/v1/admin/llm_config/test' do
      context 'when no provider is saved and no params supplied' do
        it 'returns 422' do
          post '/api/v1/admin/llm_config/test', headers: headers
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end

      context 'when params are supplied directly (test before save)' do
        before do
          stub_request(:post, %r{test-before-save\.example\.com}).to_return(
            status: 200,
            body:   { choices: [{ message: { content: 'OK' } }] }.to_json,
            headers: { 'Content-Type' => 'application/json' },
          )
        end

        it 'tests connectivity with the supplied params without requiring a saved provider' do
          post '/api/v1/admin/llm_config/test',
               params: {
                 base_url:      'https://test-before-save.example.com/api',
                 default_model: 'gpt-4o',
                 api_key:       'sk-test-key',
               }.to_json,
               headers: headers

          expect(response).to have_http_status(:success)
          body = JSON.parse(response.body)
          expect(body['success']).to be true
        end
      end
    end

    describe 'DELETE /api/v1/admin/llm_config/api_key' do
      let!(:provider) { create(:llm_provider, api_key: 'sk-admin-key-1234') }

      it 'removes the saved global provider key' do
        delete '/api/v1/admin/llm_config/api_key', headers: headers

        expect(response).to have_http_status(:success)
        expect(provider.reload.api_key).to be_nil
      end
    end
  end
end

