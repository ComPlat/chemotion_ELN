# frozen_string_literal: true

# rubocop:disable RSpec/AnyInstance -- the object under test is built inside the code path
# rubocop:disable RSpec/MultipleExpectations -- these assert one API response as a whole
# rubocop:disable RSpec/NestedGroups -- endpoint / verb / case reads better than flattening it

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
          expect(body['include_users']).to eq([])
          expect(body['exclude_users']).to eq([])
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
    end
  end
end
# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/MultipleExpectations
# rubocop:enable RSpec/NestedGroups
