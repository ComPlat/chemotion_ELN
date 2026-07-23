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
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/users/omniauth_providers' do
    pending 'TODO: Add missing spec'
  end

  describe 'PUT /api/v1/users/update_counter' do
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/users/scifinder' do
    pending 'TODO: Add missing spec'
  end

  describe 'DELETE /api/v1/users/sign_out' do
    pending 'TODO: Add missing spec'
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
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/devices/current_connection' do
    pending 'TODO: Add missing spec'
  end
end
