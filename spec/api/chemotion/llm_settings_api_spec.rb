# frozen_string_literal: true

# rubocop:disable RSpec/MultipleExpectations -- these assert one API response as a whole
# rubocop:disable RSpec/NestedGroups -- endpoint / verb / case reads better than flattening it

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
      let!(:own_provider) { create(:llm_provider, :personal, user: user, api_key: 'sk-secret-9999') }

      before do
        create(:user_llm_setting, user: user, default_llm_provider: own_provider)
        create(:user_task_model_mapping, user: user, task_name: 'sds_extraction', model: 'gpt-4')
      end

      it 'returns the preference and the user’s own providers, keys masked' do
        get '/api/v1/users/llm_settings', headers: headers

        body = JSON.parse(response.body)
        expect(body['setting']['provider_type']).to eq('custom')
        expect(body['setting']['default_llm_provider_id']).to eq(own_provider.id)
        expect(body['providers'].first['api_key_masked']).to match(/sk-•+\d{4}/)
        # full plaintext key must not be exposed
        expect(response.body).not_to include('sk-secret-9999')
      end

      it 'returns task model mappings' do
        get '/api/v1/users/llm_settings', headers: headers

        body = JSON.parse(response.body)
        expect(body['task_mappings']).to include(
          { 'task_name' => 'sds_extraction', 'model' => 'gpt-4', 'llm_provider_id' => nil },
        )
      end
    end
  end

  describe 'PUT /api/v1/users/llm_settings' do
    context 'when creating new settings' do
      let(:payload) do
        {
          provider_type: 'custom',
          task_mappings: [{ task_name: 'sds_extraction', model: 'gpt-4' }],
        }
      end

      it 'creates the settings record' do
        put '/api/v1/users/llm_settings', params: payload.to_json, headers: headers

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['success']).to be true
      end

      it 'records which of my own providers is the default' do
        provider = create(:llm_provider, :personal, user: user)
        put '/api/v1/users/llm_settings',
            params: payload.merge(default_llm_provider_id: provider.id).to_json, headers: headers

        expect(response).to have_http_status(:ok)
        expect(user.reload.user_llm_setting.default_llm_provider_id).to eq(provider.id)
      end

      it 'refuses a default provider belonging to another user' do
        theirs = create(:llm_provider, :personal, user: create(:person))
        put '/api/v1/users/llm_settings',
            params: payload.merge(default_llm_provider_id: theirs.id).to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(user.reload.user_llm_setting&.default_llm_provider_id).to be_nil
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

    context 'when routing one task to a provider' do
      let!(:mine) { create(:llm_provider, :personal, user: user) }

      it 'stores the provider alongside the model' do
        put '/api/v1/users/llm_settings',
            params: { task_mappings: [{ task_name: 'sds_extraction', model: 'gpt-4',
                                        llm_provider_id: mine.id }] }.to_json,
            headers: headers

        mapping = user.user_task_model_mappings.find_by(task_name: 'sds_extraction')
        expect(mapping.llm_provider_id).to eq(mine.id)
      end

      it 'stores a provider-only override (the provider’s own default model)' do
        put '/api/v1/users/llm_settings',
            params: { task_mappings: [{ task_name: 'sds_extraction', llm_provider_id: mine.id }] }.to_json,
            headers: headers

        mapping = user.user_task_model_mappings.find_by(task_name: 'sds_extraction')
        expect(mapping.model).to be_nil
        expect(mapping.llm_provider_id).to eq(mine.id)
      end

      it 'refuses another user’s provider' do
        theirs = create(:llm_provider, :personal, user: create(:person))
        put '/api/v1/users/llm_settings',
            params: { task_mappings: [{ task_name: 'sds_extraction', llm_provider_id: theirs.id }] }.to_json,
            headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(user.user_task_model_mappings).to be_empty
      end

      it 'removes the override when neither provider nor model is given' do
        create(:user_task_model_mapping, user: user, task_name: 'sds_extraction', model: 'gpt-4')
        put '/api/v1/users/llm_settings',
            params: { task_mappings: [{ task_name: 'sds_extraction', model: '' }] }.to_json,
            headers: headers

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

    describe 'POST /api/v1/users/llm_settings/models' do
      let(:base_url)   { 'https://ki-toolbox.scc.kit.edu/api' }
      let(:models_url) { "#{base_url}/v1/models" }

      before do
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

      it 'uses the key as typed — an unsaved provider has none on the server yet' do
        post '/api/v1/users/llm_settings/models',
             params:  { base_url: base_url, api_key: 'sk-typed' }.to_json,
             headers: headers

        expect(WebMock).to have_requested(:get, models_url)
          .with(headers: { 'Authorization' => 'Bearer sk-typed' }).once
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

    # The institution provider is the one case a user cannot fix from this form,
    # so the answer has to say what is wrong rather than relay the provider's own
    # reply (KI-Toolbox answers a model-less request with a redis error string).
    context 'when the institution provider has no default model' do
      before do
        # update_column, deliberately: a provider this broken can no longer be
        # *saved*, but rows predating that validation exist in the wild — which is
        # exactly the case under test.
        # rubocop:disable Rails/SkipsModelValidations
        create(:llm_provider).update_column(:default_model, '')
        # rubocop:enable Rails/SkipsModelValidations
      end

      it 'returns 422 naming the missing model, without calling the provider' do
        post '/api/v1/users/llm_settings/verify', params: {}.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include('No model is set')
        expect(WebMock).not_to have_requested(:post, /ki-toolbox/)
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

  # ── The user's own providers ────────────────────────────────────────────────

  describe '/api/v1/users/llm_providers' do
    let(:base_url) { 'https://ki-toolbox.scc.kit.edu/api' }
    let(:create_params) do
      {
        name:          'My KI-Toolbox',
        api_protocol:  'openai',
        base_url:      base_url,
        default_model: 'kit.qwen3.5-397b-A17b',
        api_key:       'sk-mine-1234',
      }
    end

    describe 'POST' do
      it 'creates a provider and reports it with the key masked' do
        post '/api/v1/users/llm_providers', params: create_params.to_json, headers: headers

        provider = LlmProvider.for_user(user).last
        expect(provider.name).to eq('My KI-Toolbox')
        expect(provider.api_key).to eq('sk-mine-1234')
        expect(response.body).not_to include('sk-mine-1234')
      end

      it 'makes the first provider the default for tasks that name none' do
        post '/api/v1/users/llm_providers', params: create_params.to_json, headers: headers

        expect(user.reload.user_llm_setting.default_llm_provider_id).to eq(LlmProvider.for_user(user).last.id)
      end

      it 'leaves the default alone once one is set' do
        post '/api/v1/users/llm_providers', params: create_params.to_json, headers: headers
        first_id = user.reload.user_llm_setting.default_llm_provider_id

        post '/api/v1/users/llm_providers',
             params: create_params.merge(name: 'Second').to_json, headers: headers

        expect(user.reload.user_llm_setting.default_llm_provider_id).to eq(first_id)
      end

      it 'rejects a provider with no model' do
        post '/api/v1/users/llm_providers',
             params: create_params.merge(default_model: '').to_json, headers: headers

        expect(LlmProvider.for_user(user)).to be_empty
      end

      context 'when personal providers are not permitted (SF-03 gate)' do
        before do
          Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: [])
        end

        it 'returns 403 and stores nothing' do
          post '/api/v1/users/llm_providers', params: create_params.to_json, headers: headers

          expect(response).to have_http_status(:forbidden)
          expect(LlmProvider.for_user(user)).to be_empty
        end
      end
    end

    describe 'GET' do
      it 'lists only my own providers' do
        mine = create(:llm_provider, :personal, user: user)
        create(:llm_provider, :personal, user: create(:person))
        create(:llm_provider) # the institution provider

        get '/api/v1/users/llm_providers', headers: headers

        ids = JSON.parse(response.body)['providers'].pluck('id')
        expect(ids).to eq([mine.id])
      end
    end

    describe 'PUT' do
      let!(:mine) { create(:llm_provider, :personal, user: user, api_key: 'sk-mine') }

      it 'updates the fields it is given and keeps the stored key' do
        put "/api/v1/users/llm_providers/#{mine.id}",
            params: { default_model: 'another-model' }.to_json, headers: headers

        expect(mine.reload.default_model).to eq('another-model')
        expect(mine.api_key).to eq('sk-mine')
      end

      it 'drops the stored key when the endpoint moves without a new one' do
        put "/api/v1/users/llm_providers/#{mine.id}",
            params: { base_url: 'https://elsewhere.example/api' }.to_json, headers: headers

        expect(mine.reload.api_key).to be_nil
      end

      it 'cannot reach another user’s provider' do
        theirs = create(:llm_provider, :personal, user: create(:person), name: 'Theirs')

        put "/api/v1/users/llm_providers/#{theirs.id}",
            params: { name: 'Mine now' }.to_json, headers: headers

        expect(response).to have_http_status(:not_found)
        expect(theirs.reload.name).to eq('Theirs')
      end
    end

    describe 'DELETE' do
      let!(:mine) { create(:llm_provider, :personal, user: user) }

      it 'removes the provider, the task overrides naming it, and the default pointer' do
        UserLlmSetting.create!(user: user, provider_type: 'custom', default_llm_provider: mine)
        UserTaskModelMapping.create!(user: user, task_name: 'sds_extraction', llm_provider: mine, model: 'm')

        delete "/api/v1/users/llm_providers/#{mine.id}", headers: headers

        expect(LlmProvider.for_user(user)).to be_empty
        expect(user.user_task_model_mappings).to be_empty
        expect(user.user_llm_setting.reload.default_llm_provider_id).to be_nil
      end

      it 'cannot delete another user’s provider' do
        theirs = create(:llm_provider, :personal, user: create(:person))

        delete "/api/v1/users/llm_providers/#{theirs.id}", headers: headers

        expect(response).to have_http_status(:not_found)
        expect(theirs.reload).to be_present
      end
    end

    describe 'POST :id/verify' do
      let!(:mine) { create(:llm_provider, :personal, user: user, base_url: base_url) }

      it 'tests the saved provider without the key being re-sent' do
        stub_request(:post, "#{base_url}/v1/chat/completions").to_return(
          status: 200, body: { choices: [{ message: { content: 'OK' } }] }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

        post "/api/v1/users/llm_providers/#{mine.id}/verify", headers: headers

        expect(JSON.parse(response.body)['success']).to be true
      end

      it 'reports a provider with no model as a configuration error, not a provider failure' do
        mine.update_column(:default_model, '') # rubocop:disable Rails/SkipsModelValidations

        post "/api/v1/users/llm_providers/#{mine.id}/verify", headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include('No model is set')
      end
    end

    describe 'POST :id/models' do
      let(:old_url) { 'https://old-endpoint.example/api' }
      let(:new_url) { 'https://new-endpoint.example/api' }
      let!(:mine)   { create(:llm_provider, :personal, user: user, base_url: old_url, api_key: 'sk-old-key') }

      before do
        stub_request(:get, "#{old_url}/v1/models").to_return(
          status: 200, body: { 'data' => [{ 'id' => 'old-model' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        stub_request(:get, "#{new_url}/v1/models").to_return(
          status: 200, body: { 'data' => [{ 'id' => 'new-model' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        post "/api/v1/users/llm_providers/#{mine.id}/models", headers: headers
      end

      it 'lists the provider’s models' do
        expect(JSON.parse(response.body)['models']).to eq(['old-model'])
      end

      it 'serves a repeat lookup from the cache' do
        post "/api/v1/users/llm_providers/#{mine.id}/models", headers: headers

        expect(WebMock).to have_requested(:get, "#{old_url}/v1/models").once
      end

      it 'drops the catalogue of the endpoint the provider moved away from' do
        put "/api/v1/users/llm_providers/#{mine.id}",
            params: { base_url: new_url, api_key: 'sk-new-key' }.to_json, headers: headers
        put "/api/v1/users/llm_providers/#{mine.id}",
            params: { base_url: old_url, api_key: 'sk-old-key' }.to_json, headers: headers

        post "/api/v1/users/llm_providers/#{mine.id}/models", headers: headers

        # Twice, not once: the pre-move entry was evicted rather than re-served.
        expect(WebMock).to have_requested(:get, "#{old_url}/v1/models").twice
      end

      it 'lists the new endpoint’s models after a move' do
        put "/api/v1/users/llm_providers/#{mine.id}",
            params: { base_url: new_url, api_key: 'sk-new-key' }.to_json, headers: headers

        post "/api/v1/users/llm_providers/#{mine.id}/models", headers: headers

        expect(JSON.parse(response.body)['models']).to eq(['new-model'])
      end
    end
  end
end
# rubocop:enable RSpec/MultipleExpectations
# rubocop:enable RSpec/NestedGroups
