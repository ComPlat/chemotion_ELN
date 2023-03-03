# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Oauth::RadarController, type: :request do
  include Warden::Test::Helpers

  let(:user) { create(:person) }
  let(:user_collection) { create(:collection) }
  let(:bad_collection) { create(:collection) }
  let(:access_token) { 'ooF7uach' }
  let(:workspace_id) { 'eiVah5Co' }
  let(:dataset_id) { 'cha3aeYa' }
  let(:file_id) { 'geiHee7o' }
  let(:mock_responses) do
    {
      'token' => {
        'access_token': access_token
      },
      'workspaces' => {
        'data': [
          {
            'id': workspace_id,
            'descriptiveMetadata': {
              'title': 'Workspace Title'
            }
          }
        ]
      },
      'datasets' => {
        'id': dataset_id
      },
      'file' => {
        'id': file_id
      }
    }
  end

  before do
    login_as user, scope: :user
    user.collections << user_collection
    user_collection.metadata = create(:metadata)

    # mock the responses from radar
    allow(HTTParty).to receive(:get) do |url|
      key = url.rpartition('/').last
      instance_double(HTTParty::Response, body: JSON.dump(mock_responses[key]))
    end
    allow(HTTParty).to receive(:post) do |url|
      key = url.rpartition('/').last
      instance_double(HTTParty::Response, body: JSON.dump(mock_responses[key]))
    end
  end

  describe 'archive workflow' do

    it "when everything is okay" do
      get '/oauth/radar/archive?collection_id=%i' % user_collection.id
      expect(response).to have_http_status(:redirect)
      expect(session[:radar_collection_id]).to eq(user_collection.id.to_s)
      state = session[:radar_oauth2_state]
      expect(state.length).to be(36)
      url = 'https://radar.example.com/radar-backend/oauth/authorize?' + {
        client_id: 'test_id',
        redirect_uri: 'https://redirect.example.com',
        response_type: 'code',
        state: state
      }.to_query
      expect(response).to redirect_to url

      get '/oauth/radar/callback?state=%s' % state
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to 'http://www.example.com/oauth/radar/select'
      expect(session[:radar_access_token]).to eq(access_token)

      get '/oauth/radar/select'
      expect(response).to have_http_status(:success)

      post '/oauth/radar/select', :params => {workspace: workspace_id}
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to 'http://www.example.com/oauth/radar/export'

      get '/oauth/radar/export'
      expect(response).to have_http_status(:success)

      export = Export::ExportCollections.new('test-job-id', [user_collection.id], 'zip', true)
      export.prepare_data
      export.to_file

      file_id = Oauth2::Radar::store_file(@access_token, dataset_id, export.file_path)

      user_collection.metadata.set_radar_ids(dataset_id, file_id)

      get '/oauth/radar/export'
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to 'https://radar.example.com/radar/en/dataset/%s' % dataset_id
    end

  end

  describe 'archive' do

    it "when collection does not belong to the user" do
      get '/oauth/radar/archive?collection_id=%i' % bad_collection.id
      expect(response).to have_http_status(:forbidden)
    end

    it "when collection_id is missing" do
      get '/oauth/radar/archive'
      expect(response).to have_http_status(:bad_request)
    end

  end

  describe 'callback' do

    it "when the state parameter does not match" do
      get '/oauth/radar/callback?state=wrong'
      expect(response).to have_http_status(:bad_request)
    end

  end

  describe 'select' do

    it "when collection_id is not in the session" do
      get '/oauth/radar/select'
      expect(response).to have_http_status(:forbidden)
    end

  end

  describe 'export' do

    it "when collection_id is not in the session" do
      get '/oauth/radar/export'
      expect(response).to have_http_status(:forbidden)
    end

  end

end
