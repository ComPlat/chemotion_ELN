# frozen_string_literal: true

# rubocop:disable RSpec/AnyInstance -- the object under test is built inside the code path
# rubocop:disable RSpec/MultipleExpectations -- these assert one API response as a whole
# rubocop:disable RSpec/NestedGroups -- endpoint / verb / case reads better than flattening it

require 'rails_helper'

describe Chemotion::AdminLlmProvidersAPI do
  let(:headers) { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }

  context 'when the current user is not an admin' do
    let(:regular_user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(regular_user)
    end

    it 'rejects with 401' do
      get '/api/v1/admin/llm_providers', headers: headers
      expect(response).to have_http_status(:unauthorized)
    end
  end

  context 'when the current user is an admin' do
    let!(:admin) { create(:admin) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
    end

    describe 'GET /api/v1/admin/llm_providers' do
      it 'returns every institution provider, keys masked, personal ones excluded' do
        first  = create(:llm_provider, api_key: 'sk-admin-0000')
        second = create(:llm_provider, base_url: 'https://second.example/api')
        create(:llm_provider, :personal, user: create(:person))

        get '/api/v1/admin/llm_providers', headers: headers

        body = JSON.parse(response.body)
        expect(body['providers'].pluck('id')).to eq([first.id, second.id])
        expect(body['providers'].first['api_key_masked']).to match(/sk-\u2022+\d{4}/)
        expect(response.body).not_to include('sk-admin-0000')
      end
    end

    describe 'POST /api/v1/admin/llm_providers' do
      let(:create_params) do
        {
          name:          'Example AI',
          api_protocol:  'openai',
          base_url:      'https://ai.example.com',
          default_model: 'gpt-4o',
          api_key:       'sk-new-key-1234',
        }
      end

      it 'adds an institution provider' do
        expect do
          post '/api/v1/admin/llm_providers', params: create_params.to_json, headers: headers
        end.to change(LlmProvider.global_providers, :count).by(1)

        expect(response).to have_http_status(:created)
        provider = LlmProvider.global_providers.last
        expect(provider.name).to eq('Example AI')
        expect(provider.scope).to eq('global')
        expect(provider.api_key).to eq('sk-new-key-1234')
      end

      it 'keeps a second provider alongside the first' do
        create(:llm_provider)

        post '/api/v1/admin/llm_providers', params: create_params.to_json, headers: headers

        expect(LlmProvider.global_providers.count).to eq(2)
      end

      it 'rejects a provider with no model' do
        post '/api/v1/admin/llm_providers',
             params: create_params.merge(default_model: '').to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    describe 'PUT /api/v1/admin/llm_providers/:id' do
      let!(:provider) { create(:llm_provider, api_key: 'sk-admin-key-1234') }

      it 'updates the fields it is given and keeps the stored key' do
        put "/api/v1/admin/llm_providers/#{provider.id}",
            params: { default_model: 'gpt-4-turbo' }.to_json, headers: headers

        expect(response).to have_http_status(:ok)
        expect(provider.reload.default_model).to eq('gpt-4-turbo')
        expect(provider.api_key).to eq('sk-admin-key-1234')
      end

      it 'drops the stored key when the endpoint moves without a new one' do
        put "/api/v1/admin/llm_providers/#{provider.id}",
            params: { base_url: 'https://elsewhere.example/api' }.to_json, headers: headers

        expect(provider.reload.api_key).to be_nil
      end

      it 'refuses to touch a personal provider' do
        personal = create(:llm_provider, :personal, user: create(:person), name: 'Not yours')

        put "/api/v1/admin/llm_providers/#{personal.id}",
            params: { name: 'Taken over' }.to_json, headers: headers

        expect(response).to have_http_status(:not_found)
        expect(personal.reload.name).to eq('Not yours')
      end
    end

    describe 'DELETE /api/v1/admin/llm_providers/:id' do
      let!(:provider) { create(:llm_provider) }

      it 'removes the provider' do
        expect do
          delete "/api/v1/admin/llm_providers/#{provider.id}", headers: headers
        end.to change(LlmProvider.global_providers, :count).by(-1)
      end

      it 'leaves the users who pointed at it on the remaining provider' do
        spare = create(:llm_provider, base_url: 'https://spare.example/api')
        user  = create(:person)
        setting = create(:user_llm_setting, :global, user: user, institution_llm_provider: provider)

        delete "/api/v1/admin/llm_providers/#{provider.id}", headers: headers

        expect(setting.reload.institution_llm_provider_id).to be_nil
        expect(LlmProviderResolver.institution_provider_for(user)).to eq(spare)
      end
    end

    describe 'DELETE /api/v1/admin/llm_providers/:id/api_key' do
      let!(:provider) { create(:llm_provider, api_key: 'sk-admin-key-1234') }

      it 'removes the saved key and keeps the provider' do
        delete "/api/v1/admin/llm_providers/#{provider.id}/api_key", headers: headers

        expect(response).to have_http_status(:success)
        expect(provider.reload.api_key).to be_nil
        expect(LlmProvider.global_providers).to include(provider)
      end
    end

    describe 'POST /api/v1/admin/llm_providers/test' do
      context 'when no params are supplied' do
        it 'returns 422' do
          post '/api/v1/admin/llm_providers/test', params: {}.to_json, headers: headers
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end

      context 'when params are supplied directly (test before save)' do
        before do
          stub_request(:post, /test-before-save\.example\.com/).to_return(
            status: 200,
            body: { choices: [{ message: { content: 'OK' } }] }.to_json,
            headers: { 'Content-Type' => 'application/json' },
          )
        end

        it 'tests connectivity with the supplied params without requiring a saved provider' do
          post '/api/v1/admin/llm_providers/test',
               params: {
                 base_url:      'https://test-before-save.example.com/api',
                 default_model: 'gpt-4o',
                 api_key:       'sk-test-key',
               }.to_json,
               headers: headers

          expect(response).to have_http_status(:success)
          expect(JSON.parse(response.body)['success']).to be true
        end
      end
    end

    describe 'POST /api/v1/admin/llm_providers/:id/verify' do
      let!(:provider) { create(:llm_provider, api_key: 'sk-admin-key-1234') }

      before do
        stub_request(:post, 'https://ki-toolbox.scc.kit.edu/api/v1/chat/completions').to_return(
          status: 200,
          body: { choices: [{ message: { content: 'OK' } }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
      end

      it 'tests the saved provider with its stored key' do
        post "/api/v1/admin/llm_providers/#{provider.id}/verify", headers: headers

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)['success']).to be true
      end
    end

    describe 'PUT /api/v1/admin/llm_providers/:id/grants' do
      let!(:provider) { create(:llm_provider) }
      let(:person)    { create(:person) }

      it 'stores a provider rule and a model rule' do
        put "/api/v1/admin/llm_providers/#{provider.id}/grants",
            params: {
              grants: [
                { model: '', enabled: true, exclude_ids: [person.id] },
                { model: 'kit.llama3', enabled: false, include_ids: [person.id] },
              ],
            }.to_json,
            headers: headers

        expect(response).to have_http_status(:ok)
        rules = provider.reload.llm_provider_grants.order(:model)
        expect(rules.map(&:model)).to contain_exactly(nil, 'kit.llama3')
        expect(rules.find(&:provider_rule?).exclude_ids).to eq([person.id])
      end

      it 'replaces the previous rules rather than adding to them' do
        create(:llm_provider_grant, llm_provider: provider, model: 'gone')

        put "/api/v1/admin/llm_providers/#{provider.id}/grants",
            params: { grants: [{ model: 'kept', enabled: true }] }.to_json,
            headers: headers

        expect(provider.reload.llm_provider_grants.map(&:model)).to eq(['kept'])
      end

      it 'clears every rule when given an empty list' do
        create(:llm_provider_grant, llm_provider: provider, model: 'gone')

        put "/api/v1/admin/llm_providers/#{provider.id}/grants",
            params: { grants: [] }.to_json, headers: headers

        expect(provider.reload.llm_provider_grants).to be_empty
      end

      it 'returns the rules on the provider payload' do
        put "/api/v1/admin/llm_providers/#{provider.id}/grants",
            params: { grants: [{ model: 'kit.llama3', enabled: false, include_ids: [person.id] }] }.to_json,
            headers: headers

        grant = JSON.parse(response.body)['provider']['grants'].first
        expect(grant['model']).to eq('kit.llama3')
        expect(grant['include_users'].first['value']).to eq(person.id)
      end

      it 'refuses to write rules for a personal provider' do
        personal = create(:llm_provider, :personal, user: person)

        put "/api/v1/admin/llm_providers/#{personal.id}/grants",
            params: { grants: [] }.to_json, headers: headers

        expect(response).to have_http_status(:not_found)
      end

      it 'rejects two rules about the same model' do
        put "/api/v1/admin/llm_providers/#{provider.id}/grants",
            params: {
              grants: [
                { model: 'kit.llama3', enabled: true },
                { model: 'kit.llama3', enabled: false },
              ],
            }.to_json,
            headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(provider.reload.llm_provider_grants).to be_empty
      end
    end

    describe 'PUT /api/v1/admin/llm_providers/:id restrict_models' do
      let!(:provider) { create(:llm_provider) }

      it 'turns the model restriction on' do
        put "/api/v1/admin/llm_providers/#{provider.id}",
            params: { restrict_models: true }.to_json, headers: headers

        expect(provider.reload.restrict_models).to be true
      end
    end

    describe 'POST /api/v1/admin/llm_providers/:id/models' do
      let(:base_url)   { 'https://ki-toolbox.scc.kit.edu/api' }
      let(:models_url) { "#{base_url}/v1/models" }
      let!(:provider)  { create(:llm_provider, base_url: base_url, api_key: 'sk-admin-key-1234') }

      before do
        stub_request(:get, models_url).to_return(
          status:  200,
          body:    { 'data' => [{ 'id' => 'kit.llama3' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
      end

      it 'returns the provider model list' do
        post "/api/v1/admin/llm_providers/#{provider.id}/models", headers: headers

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)['models']).to eq(['kit.llama3'])
      end

      it 'serves a repeat lookup from the cache' do
        2.times { post "/api/v1/admin/llm_providers/#{provider.id}/models", headers: headers }

        expect(WebMock).to have_requested(:get, models_url).once
      end

      it 're-reads the catalogue when the admin asks for a refresh' do
        post "/api/v1/admin/llm_providers/#{provider.id}/models", headers: headers
        post "/api/v1/admin/llm_providers/#{provider.id}/models",
             params: { refresh: true }.to_json, headers: headers

        expect(WebMock).to have_requested(:get, models_url).twice
      end

      it 'drops the cached catalogue when the provider endpoint is changed' do
        post "/api/v1/admin/llm_providers/#{provider.id}/models", headers: headers

        new_url = 'https://new-endpoint.example/api'
        stub_request(:get, "#{new_url}/v1/models").to_return(
          status:  200,
          body:    { 'data' => [{ 'id' => 'new-model' }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        put "/api/v1/admin/llm_providers/#{provider.id}",
            params: { base_url: new_url, api_key: 'sk-new-key' }.to_json, headers: headers

        # Back to the previous endpoint: the entry cached under the old identity —
        # which every user of that provider shared — must be gone.
        put "/api/v1/admin/llm_providers/#{provider.id}",
            params: { base_url: base_url, api_key: 'sk-admin-key-1234' }.to_json, headers: headers
        post "/api/v1/admin/llm_providers/#{provider.id}/models", headers: headers

        expect(WebMock).to have_requested(:get, models_url).twice
      end
    end
  end
end
# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/MultipleExpectations
# rubocop:enable RSpec/NestedGroups
