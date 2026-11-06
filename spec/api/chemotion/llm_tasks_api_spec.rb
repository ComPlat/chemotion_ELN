# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::LlmTasksAPI do
  include_context 'api request authorization context'

  let(:models_url) { 'https://ki-toolbox.scc.kit.edu/api/v1/models' }

  def stub_catalogue(*ids)
    stub_request(:get, models_url).to_return(
      status: 200, body: { 'data' => ids.map { |id| { 'id' => id } } }.to_json,
      headers: { 'Content-Type' => 'application/json' }
    )
  end

  describe 'GET /api/v1/llm/tasks' do
    it 'lists the registered tasks without their prompts' do
      get '/api/v1/llm/tasks'

      names = JSON.parse(response.body).pluck('name')
      expect(names).to include('sds_extraction')
      expect(response.body).not_to include('system_prompt')
    end

    it 'answers 404 for a task the registry does not know' do
      get '/api/v1/llm/tasks/no_such_task'

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /api/v1/llm/available' do
    it 'is false when no provider is configured' do
      get '/api/v1/llm/available'

      expect(JSON.parse(response.body)).to eq('available' => false)
    end

    it 'is true when an institution provider serves the user' do
      create(:llm_provider)
      get '/api/v1/llm/available'

      expect(JSON.parse(response.body)).to eq('available' => true)
    end
  end

  describe 'GET /api/v1/llm/access' do
    after { Matrice.find_by(name: 'aiUserApiKey')&.destroy }

    it 'reports each gate separately' do
      Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: [])
      get '/api/v1/llm/access'

      expect(JSON.parse(response.body))
        .to eq('institution_allowed' => true, 'personal_allowed' => false, 'any_allowed' => true)
    end
  end

  describe 'GET /api/v1/llm/institution_models' do
    let!(:provider) { create(:llm_provider) }

    it 'filters the shared catalogue to the models this user may pick' do
      stub_catalogue('kit.open', 'kit.secret')
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.secret', exclude_ids: [user.id])

      get "/api/v1/llm/institution_models?provider_id=#{provider.id}"

      expect(JSON.parse(response.body)['models']).to eq(['kit.open'])
    end

    it 'filters a cached catalogue too' do
      stub_catalogue('kit.open', 'kit.secret')
      LlmModelCatalog.fetch(base_url: provider.base_url, api_key: provider.api_key)
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.secret', exclude_ids: [user.id])

      get "/api/v1/llm/institution_models?provider_id=#{provider.id}"

      expect(JSON.parse(response.body)['models']).to eq(['kit.open'])
      expect(WebMock).to have_requested(:get, models_url).once
    end

    it 'treats a personal provider id as no institution provider, spending no key' do
      stub_catalogue('kit.open')
      theirs = create(:llm_provider, :personal, user: create(:person))

      get "/api/v1/llm/institution_models?provider_id=#{theirs.id}"

      expect(JSON.parse(response.body)['models']).to eq([])
      expect(WebMock).not_to have_requested(:get, %r{v1/models})
    end

    it 'lists nothing for a user the institution gate denies' do
      stub_catalogue('kit.open')
      Matrice.find_or_create_by(name: 'aiGlobalProvider').update!(enabled: false, include_ids: [], exclude_ids: [])

      get "/api/v1/llm/institution_models?provider_id=#{provider.id}"

      expect(JSON.parse(response.body)['models']).to eq([])
    ensure
      Matrice.find_by(name: 'aiGlobalProvider')&.destroy
    end
  end
end
