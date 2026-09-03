# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/users/name' do
    let(:query_param) { "name=#{name_param}&type=Group,Person" }

    before do
      create(:person, first_name: 'Jane', last_name: 'Doe')
      create(:person, first_name: 'Jill', last_name: 'Notfound')
      create(:group, first_name: 'Doe', last_name: 'Group Test')

      get "/api/v1/users/name.json?#{query_param}"
    end

    context 'when name is given' do
      let(:name_param) { 'Doe' }

      it 'returns 3 matched user and group names' do
        expect(JSON.parse(response.body)['users'].length).to eq(3)
      end

      it 'returns data from 2 people and 1 group' do
        expect(
          JSON.parse(response.body)['users'].pluck('type'),
        ).to contain_exactly('Person', 'Person', 'Group')
      end
    end

    context 'when name is missing' do
      let(:query_param) { '' }

      it 'returns an empty array' do
        expect(JSON.parse(response.body)['error']).to eq('name is missing')
      end
    end

    context 'when name is empty' do
      let(:name_param) { '' }

      it 'returns an empty array' do
        expect(JSON.parse(response.body)['users'].length).to eq(0)
      end
    end
  end

  describe 'GET /api/v1/users/current' do
    context 'when authorization runs via session' do
      let(:expected_response) do
        Entities::UserEntity.represent(user, root: :user, with_tokens: true).to_json
      end

      before do
        get '/api/v1/users/current'
      end

      it 'returns current user' do
        expect(response.body).to eq(expected_response)
      end
    end

    context 'when authorization runs via jwt' do
      include_context 'api request jwt context'

      let(:expected_response) do
        Entities::UserEntity.represent(jwt_user.reload, root: :user, with_tokens: true).to_json
      end

      before do
        get '/api/v1/users/current', headers: jwt_request_header
      end

      it 'returns current user' do
        expect(response.body).to eq(expected_response)
      end

      context 'when token is invalid' do
        let(:jwt_token) { 42 }

        it 'returns 401 unauthorized status code' do
          expect(response).to have_http_status :unauthorized
        end
      end
    end
  end

  describe 'GET /api/v1/users/list_editors' do
    before do
      create(:matrice, name: 'ketcherEditor', enabled: true)
      create(:matrice, name: 'marvinjsEditor', enabled: false)
      user.reload
      get '/api/v1/users/list_editors'
    end

    it 'returns only the editors enabled for the current user' do
      expect(parsed_json_response['matrices'].pluck('name')).to eq(['ketcherEditor'])
    end
  end

  describe 'GET /api/v1/users/omniauth_providers' do
    before do
      get '/api/v1/users/omniauth_providers'
    end

    it 'returns the omniauth providers configured for the app' do
      expect(parsed_json_response['providers']).to eq(Devise.omniauth_configs.keys.map(&:to_s))
    end

    # Regression: this used to serialize the whole current_user object, leaking
    # encrypted_otp_secret/otp_secret/otp_backup_codes to any authenticated user.
    it "returns only the current user's linked providers" do
      expect(parsed_json_response['current_user']).to eq('providers' => nil)
    end

    context 'when the user has linked providers' do
      let(:user) { create(:person, providers: { 'github' => { 'uid' => '123' } }) }

      it "returns the user's linked providers" do
        expect(parsed_json_response['current_user']['providers']).to eq('github' => { 'uid' => '123' })
      end
    end
  end

  describe 'PUT /api/v1/users/update_counter' do
    before do
      put '/api/v1/users/update_counter', params: { type: 'samples', counter: 5 }, as: :json
    end

    it 'updates the given counter and preserves the others' do
      expect(parsed_json_response['counters']).to eq('samples' => '5', 'reactions' => '0', 'wellplates' => '0')
    end
  end

  describe 'GET /api/v1/users/scifinder' do
    context 'when no credential exists for the current user' do
      before { get '/api/v1/users/scifinder' }

      it 'returns an empty credential' do
        expect(parsed_json_response).to eq(
          'id' => nil, 'access_token' => nil, 'refresh_token' => nil, 'expires_at' => nil, 'updated_at' => nil,
        )
      end
    end

    context 'when a credential exists for the current user' do
      let!(:credential) do
        ScifinderNCredential.create!(
          created_by: user.id, access_token: 'tok', refresh_token: 'ref', expires_at: 1.day.from_now,
        )
      end

      before { get '/api/v1/users/scifinder' }

      it "returns the current user's credential" do
        expect(parsed_json_response['id']).to eq(credential.id)
        expect(parsed_json_response['access_token']).to eq('tok')
      end
    end
  end

  describe 'DELETE /api/v1/users/sign_out' do
    it 'returns 204' do
      delete '/api/v1/users/sign_out'
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'GET /api/v1/users/devices' do
    let(:own_device) { create(:device) }
    let(:group_device) { create(:device) }
    let(:unrelated_device) { create(:device) }
    let!(:group) { create(:group, admins: [user], users: [user]) }

    before do
      own_device.people << user
      group_device.groups << group
      get '/api/v1/users/devices'
    end

    it "returns the user's own devices and their groups' devices" do
      ids = parsed_json_response['currentDevices'].pluck('id')
      expect(ids).to include(own_device.id, group_device.id)
      expect(ids).not_to include(unrelated_device.id)
    end
  end

  describe 'GET /api/v1/devices/{device_id}/metadata' do
    let(:device) { create(:device) }
    let!(:device_metadata) { create(:device_metadata, device: device) }

    context 'when the device belongs to the current user' do
      before do
        device.people << user
        get "/api/v1/devices/#{device.id}/metadata"
      end

      it 'returns the device metadata' do
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['device_metadata']['id']).to eq(device_metadata.id)
      end
    end

    context 'when the device belongs to one of the current user\'s groups' do
      let!(:group) { create(:group, admins: [user], users: [user]) }

      before do
        device.groups << group
        get "/api/v1/devices/#{device.id}/metadata"
      end

      it 'returns the device metadata' do
        expect(response).to have_http_status(:ok)
      end
    end

    context 'when the current user has no relation to the device' do
      before { get "/api/v1/devices/#{device.id}/metadata" }

      it 'returns 404' do
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'GET /api/v1/devices/novnc' do
    let(:novnc_device) { create(:device, :novnc_settings) }
    let(:unrelated_novnc_device) { create(:device, :novnc_settings) }
    let(:device_without_target) { create(:device) }

    before do
      novnc_device.people << user
      device_without_target.people << user
      unrelated_novnc_device
      get '/api/v1/devices/novnc'
    end

    it 'returns only accessible devices that have a novnc target' do
      ids = parsed_json_response['devices'].pluck('id')
      expect(ids).to contain_exactly(novnc_device.id)
    end
  end

  describe 'GET /api/v1/devices/current_connection' do
    let(:device) { create(:device) }
    let(:path) { NOVNC_DEVICES_DIR.join(device.id.to_s) }

    after { FileUtils.rm_f(path) }

    context 'when the device belongs to the current user' do
      before do
        device.people << user
        get '/api/v1/devices/current_connection', params: { id: device.id, status: 'true' }
      end

      it 'returns 200 and appends the connection status to the device log' do
        expect(response).to have_http_status(:ok)
        expect(File.read(path)).to include("#{user.id},1")
      end
    end

    context 'when the current user has no relation to the device' do
      before do
        get '/api/v1/devices/current_connection', params: { id: device.id, status: 'true' }
      end

      it 'returns 404' do
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
