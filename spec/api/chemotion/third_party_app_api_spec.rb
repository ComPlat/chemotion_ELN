# frozen_string_literal: true

require 'rails_helper'
describe Chemotion::ThirdPartyAppAPI do
  include_context 'api request authorization context'
  let!(:admin1) { create(:admin) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin1) # rubocop:disable RSpec/AnyInstance
  end

  describe 'GET /third_party_apps/all' do
    let!(:first_3PA) { create(:third_party_app, url: 'http://test1.com', name: 'Test1-app') }
    let!(:second_3PA) { create(:third_party_app, url: 'http://test2.com', name: 'Test2-app') }

    context 'when two apps are available' do
      before do
        get '/api/v1/third_party_apps'
      end

      it 'status of get request 200?' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns all thirdPartyApps?' do
        response_data = JSON.parse(response.body)
        expect(response_data.length).to eq(2)
      end

      it 'entry of apps correct?' do
        response_data = JSON.parse(response.body)
        expect(response_data.first['name']).to eq 'Test1-app'
        expect(response_data.second['name']).to eq 'Test2-app'
        expect(response_data.first['url']).to eq 'http://test1.com'
        expect(response_data.second['url']).to eq 'http://test2.com'
      end
    end
  end

  describe 'POST /api/v1/third_party_apps/admin' do
    let(:params) { { url: 'exampleUrl', name: 'exampleApp' } }

    before do
      post '/api/v1/third_party_apps/admin', params: params
    end

    context 'when parameter are valid' do
      it 'Status code is 201' do
        expect(response).to have_http_status :created
      end

      it 'Number of third party apps correct?' do
        expect(ThirdPartyApp.count).to eq(1)
      end

      it 'Created app has correct properties' do
        expect(ThirdPartyApp.first.name).to eq 'exampleApp'
        expect(ThirdPartyApp.first.url).to eq 'exampleUrl'
      end
    end
  end

  describe 'POST /api/v1/third_party_apps/admin/{id}' do
    let(:tpa) { create(:third_party_app) }

    context 'when update is possible' do
      before do
        put "/api/v1/third_party_apps/admin/#{tpa.id}", params: { url: 'changedUrl', name: 'changedName' }
      end

      it 'status code is 201' do
        expect(response).to have_http_status :created
      end

      it 'Properties of app were updated' do
        expect(tpa.reload.name).to eq 'changedName'
        expect(tpa.reload.url).to eq 'changedUrl'
      end
    end

    context 'when update is not possible' do
      before do
        put '/api/v1/third_party_apps/admin/-1', params: { url: 'changedUrl', name: 'changedName' }
      end

      it 'status code is 404' do
        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'DELETE /api/v1/third_party_apps/admin/{id}' do
    let(:tpa) { create(:third_party_app) }

    context 'when app is deletable' do
      before do
        delete "/api/v1/third_party_apps/admin/#{tpa.id}"
      end

      it 'App is deleted' do
        expect(ThirdPartyApp.count).to eq(0)
      end

      it 'Status code is 201' do
        expect(response).to have_http_status :created
      end
    end
  end

  describe 'GET v1/third_party_apps/{id}' do
    let(:response_data) { JSON.parse(response.body) }
    let!(:first_3PA) { create(:third_party_app, url: 'http://test1.com', name: 'Test1-app') }
    let(:id) { first_3PA.id }

    context 'when 3PA is available' do
      before do
        get "/api/v1/third_party_apps/#{id}"
      end

      it 'Response code is 200' do
        expect(response).to have_http_status :ok
      end

      it 'Response has correct name and url' do
        expect(response_data['name']).to eq 'Test1-app'
        expect(response_data['url']).to eq 'http://test1.com'
      end
    end

    context 'when 3PA is not available' do
      before do
        get '/api/v1/third_party_apps/-1'
      end

      it 'Response code is 404' do
        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'GET /api/v1/third_party_apps/token' do
    let(:tpa) { create(:third_party_app) }
    let(:attachment) { create(:attachment) }
    let(:token) do
      parts = CGI.unescape(JSON.parse(response.body))
      parts.split('/').last
    end

    let(:payload) { JsonWebToken.decode(token) }

    context 'when attachment is accessable and 3pa exists' do
      before do
        get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
      end

      it 'Payload of token is correct' do
        expect(payload['attID']).to eq attachment.id
        expect(payload['userID']).to eq admin1.id
        expect(payload['appID']).to eq tpa.id
      end
    end

    context 'when attachment is not accessable and 3pa exists' do
      pending 'This is the next issue'
    end
  end

  describe '/api/v1/public/third_party_apps/{token}' do
    let(:user) { create(:person) }
    let!(:attachment) do
      create(
        :attachment,
        :with_image,
        storage: 'tmp',
        key: '8580a8d0-4b83-11e7-afc4-85a98b9d0194',
        created_by: user.id,
        created_for: user.id,
      )
    end
    let(:params_token) do
      {
        attID: attachment.id,
        userID: user.id,
        nameThirdPartyApp: 'fakeUpload',
      }
    end

    let(:payload) do
      { attID: params_token[:attID],
        userID: params_token[:userID],
        nameThirdPartyApp: params_token[:nameThirdPartyApp],
        appID: third_party_app.id }
    end

    let(:third_party_app) { create(:third_party_app) }
    let(:cache) { ActiveSupport::Cache::FileStore.new('tmp/ThirdPartyApp', expires_in: 1.hour) }
    let(:cache_key) { "#{attachment.id}/#{user.id}/#{third_party_app.id}" }
    let(:secret) { Rails.application.secrets.secret_key_base }
    let(:token) { JWT.encode(payload, secret, 'HS256') }
    let(:allowed_uploads) { 1 }
    let(:file_produced_by_3pa) do
      file_path = 'spec/fixtures/upload.jpg'
      Rack::Test::UploadedFile.new(file_path, 'spec/fixtures/upload.jpg')
    end
    let(:params) { { token: token, attachmentName: 'attachment_of_3pa', file: file_produced_by_3pa, fileType: '.csv' } }

    context 'User is allowed to upload file' do
      before do
        cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
        post "/api/v1/public/third_party_apps/#{token}", params: params
      end

      it 'upload a file' do
        expect(response.body).to include('File uploaded successfully')
      end

      it 'status code is 201' do
        expect(response).to have_http_status :created
      end

      it 'thumbnail was generated' do
        expect(Attachment.find_by(filename: 'attachment_of_3pa').thumb).to be true
      end
    end

    context 'User is not allowed to upload file' do
      context 'amount of uploads exceeded' do
        let(:allowed_uploads) { -1 }

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end
    end
  end
end
