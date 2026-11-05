# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:alternative_user) { create(:person) }

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

  describe 'GET /api/v1/users/list_labels' do
    context 'when user labels present' do
      before do
        UserLabel.create!(user_id: user.id, access_level: 0, title: 'Label 1', color: 'Color 1')
        UserLabel.create!(user_id: other_user.id, access_level: 1, title: 'Label 2', color: 'Color 2')
        UserLabel.create!(user_id: other_user.id, access_level: 0, title: 'Label 3', color: 'Color 3')
        get '/api/v1/users/list_labels'
      end

      it 'returns a list of user labels' do
        expect(parsed_json_response['labels'].length).to eq(2)
      end
    end

    context 'when user labels missing' do
      before do
        get '/api/v1/users/list_labels'
      end

      it 'returns an empty list of user labels' do
        expect(parsed_json_response['labels'].length).to eq(0)
      end
    end
  end

  describe 'GET /api/v1/users/list_editors' do
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/users/omniauth_providers' do
    pending 'TODO: Add missing spec'
  end

  describe 'PUT /api/v1/users/save_label' do
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

  describe 'GET /api/v1/groups/queryCurrentDevices' do
    # named against creation order, so the sort is not satisfied by id order
    let(:own_device) { create(:device, :novnc_settings, name: 'Zeta NMR', novnc_password: 'vnc-password') }
    let(:group_device) { create(:device, :novnc_settings, name: 'Alpha IR') }
    let!(:unrelated_device) { create(:device).tap { |device| device.people << create(:person) } }
    let!(:group) { create(:group, admins: [user], users: [user]) }

    before do
      own_device.people << user
      group_device.groups << group
      get '/api/v1/groups/queryCurrentDevices'
    end

    it "returns the user's own devices and their groups' devices" do
      ids = parsed_json_response['currentDevices'].pluck('id')
      expect(ids).to include(own_device.id, group_device.id)
      expect(ids).not_to include(unrelated_device.id)
    end

    it 'lists each device with its id, name and abbreviation', :aggregate_failures do
      devices = parsed_json_response['currentDevices']
      expect(devices.size).to eq(2)
      expect(devices.map(&:keys)).to all(contain_exactly('id', 'name', 'name_abbreviation'))
    end

    context 'when a device is linked to the user directly and through a group' do
      before do
        group_device.people << user
        get '/api/v1/groups/queryCurrentDevices'
      end

      it 'lists it once, with the devices sorted by name' do
        names = parsed_json_response['currentDevices'].pluck('name')
        expect(names).to eq(['Alpha IR', 'Zeta NMR'])
      end
    end
  end

  describe 'POST /api/v1/groups/create' do
    let(:params) do
      {
        'group_param' => {
          'first_name' => 'My', 'last_name' => 'Fanclub',
          'email' => 'jane.s@fan.club',
          'name_abbreviation' => 'JFC', 'users' => [other_user.id]
        },
      }
    end

    before do
      post '/api/v1/groups/create', params: params
    end

    it 'Creates a group of persons' do
      expect(
        Group.where(
          last_name: 'Fanclub',
          first_name: 'My', name_abbreviation: 'JFC'
        ),
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').users.pluck(:id),
      ).to contain_exactly(user.id, other_user.id)
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins,
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins.first,
      ).to eq user
      expect(
        user.administrated_accounts.where(name_abbreviation: 'JFC'),
      ).not_to be_empty
    end
  end

  describe 'GET /api/v1/groups/qrycurrent' do
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/groups/deviceMetadata/{device_id}' do
    pending 'TODO: Add missing spec'
  end

  describe 'PUT /api/v1/groups/upd/{id}' do
    let(:execute_put_request) { put "/api/v1/groups/upd/#{group.id}", params: params, as: :json }

    context 'when update group as a group admin' do
      let(:group) do
        create(:group, admins: [user], users: [user, other_user], first_name: 'Doe', last_name: 'Group Test')
      end
      let(:params) do
        {
          rm_users: [user.id, other_user.id],
          add_users: [alternative_user.id],
        }
      end

      before do
        execute_put_request
        group.reload
      end

      it 'updates a group of persons' do
        expect(group.users.pluck(:id)).to contain_exactly(alternative_user.id)
      end

      it 'returns an updated group' do
        expect(parsed_json_response['group']['users'].first['id']).to eq(alternative_user.id)
      end
    end

    context 'when destroy a group as a group admin' do
      let(:group) do
        create(:group, admins: [user], first_name: 'Doe', last_name: 'Group Test')
      end
      let(:params) { { destroy_group: true } }

      before do
        execute_put_request
      end

      it 'deletes a group of persons' do
        expect(Group.where(id: [group.id])).to be_empty
        expect(Group.count).to eq(0)
      end

      it 'returns the id of destroyed group' do
        expect(parsed_json_response['destroyed_id']).to eq(group.id)
      end
    end

    context 'when try to update a group as a non group admin' do
      let(:group) do
        create(:group, admins: [other_user], users: [other_user, alternative_user],
                       first_name: 'Doe', last_name: 'Group Test')
      end
      let(:params) do
        {
          rm_users: [other_user.id, alternative_user.id],
          add_users: [user.id],
        }
      end

      before do
        execute_put_request
      end

      it 'does not update a group of persons' do
        expect(
          Group.find(group.id).users.pluck(:id),
        ).to contain_exactly(other_user.id, alternative_user.id)
      end

      it 'returns with unauthorized status' do
        expect(response).to have_http_status(:unauthorized)
      end

      it 'returns with unauthorized message' do
        expect(parsed_json_response['error']).to eq('401 Unauthorized')
      end
    end
  end

  describe 'GET /api/v1/devices/novnc' do
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/devices/current_connection' do
    let(:device) { create(:device) }
    let(:store) { ActiveSupport::Cache::MemoryStore.new }
    let(:other_user) { create(:person) }

    before do
      stub_const('NOVNC_CONNECTIONS', store)
      # The endpoint caches its device-access check; keep it from leaking across examples and runs.
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
    end

    def poll(id: device.id, status: 'true')
      get '/api/v1/devices/current_connection', params: { id: id, status: status }
    end

    context 'when the device belongs to the current user' do
      before { device.people << user }

      it 'returns 200 and reports the user as watching' do
        poll
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['result']).to eq(["#{user.id},1"])
      end

      it 'reports the user as using when the display is focused' do
        poll(status: 'false')
        expect(parsed_json_response['result']).to eq(["#{user.id},0"])
      end

      it 'updates the entry of a user who polls again' do
        poll
        poll(status: 'false')
        expect(parsed_json_response['result']).to eq(["#{user.id},0"])
      end

      it 'lists the other viewers of the device' do
        store.write("device/#{device.id}", { other_user.id => [0, Time.current.to_i] })
        poll
        expect(parsed_json_response['result']).to contain_exactly("#{other_user.id},0", "#{user.id},1")
      end

      it 'drops viewers that stopped polling' do
        store.write("device/#{device.id}", { other_user.id => [0, Time.current.to_i] })
        travel(NOVNC_CONNECTION_TTL + 1.second) do
          poll
        end
        expect(parsed_json_response['result']).to eq(["#{user.id},1"])
      end

      it 'replaces a malformed entry with the current viewer' do
        store.write("device/#{device.id}", { other_user.id => [0, nil], 0 => 'x' })
        poll
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['result']).to eq(["#{user.id},1"])
      end

      it 'answers an empty result when the store cannot be written' do
        allow(store).to receive(:write).and_raise(Errno::ENOSPC)
        poll
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['result']).to eq([])
      end

      it 'returns 400 for an id with text after the number' do
        poll(id: "#{device.id}abc")
        expect(response).to have_http_status(:bad_request)
        expect(store.read("device/#{device.id}")).to be_nil
      end

      it 'returns 400 for a non-numeric id' do
        poll(id: 'abc')
        expect(response).to have_http_status(:bad_request)
      end
    end

    context 'when the current user has no relation to the device' do
      before do
        get '/api/v1/devices/current_connection', params: { id: device.id, status: 'true' }
      end

      it 'returns 404 and leaves the store untouched' do
        expect(response).to have_http_status(:not_found)
        expect(store.read("device/#{device.id}")).to be_nil
      end
    end
  end
end
