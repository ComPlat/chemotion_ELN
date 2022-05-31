# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:alternative_user) { create(:person) }

  describe 'GET /api/v1/users/name' do
    let(:query_param) { "name=#{name_param}" }

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
          JSON.parse(response.body)['users'].map { |u| u['user_type'] }
        ).to contain_exactly('Person', 'Person', 'Group')
      end
    end

    context 'when name is missing' do
      let(:query_param) {}

      it 'returns an empty array' do
        expect(JSON.parse(response.body)['error']).to eq('name is missing')
      end
    end

    context 'when name is empty' do
      let(:name_param) {}

      it 'returns an empty array' do
        expect(JSON.parse(response.body)['users'].length).to eq(0)
      end
    end
  end

  describe 'GET /api/v1/users/current' do
    let(:expected_response) do
      Entities::UserEntity.represent(user, root: :user).to_json
    end

    before do
      get '/api/v1/users/current'
    end

    it 'returns current user' do
      expect(response.body).to eq(expected_response)
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
        expect(parsed_json['labels'].length).to eq(2)
      end
    end

    context 'when user labels missing' do
      before do
        get '/api/v1/users/list_labels'
      end

      it 'returns an empty list of user labels' do
        expect(parsed_json['labels'].length).to eq(0)
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

  describe 'POST /api/v1/groups/create' do
    let(:params) do
      {
        'group_param' => {
          'first_name' => 'My', 'last_name' => 'Fanclub',
          'email' => 'jane.s@fan.club',
          'name_abbreviation' => 'JFC', 'users' => [other_user.id]
        }
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
        )
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').users.pluck(:id)
      ).to match_array [user.id, other_user.id]
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins.first
      ).to eq user
      expect(
        user.administrated_accounts.where(name_abbreviation: 'JFC')
      ).not_to be_empty
    end
  end

  describe 'GET /api/v1/groups/qrycurrent' do
    pending 'TODO: Add missing spec'
  end

  describe 'GET /api/v1/groups/queryCurrentDevices' do
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
          add_users: [alternative_user.id]
        }
      end

      before do
        execute_put_request
        group.reload
      end

      it 'updates a group of persons' do
        expect(group.users.pluck(:id)).to match_array([alternative_user.id])
      end

      it 'returns an updated group' do
        expect(parsed_json['group']['users'].first['id']).to eq(alternative_user.id)
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
        expect(parsed_json['destroyed_id']).to eq(group.id)
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
          add_users: [user.id]
        }
      end

      before do
        execute_put_request
      end

      it 'does not update a group of persons' do
        expect(
          Group.find(group.id).users.pluck(:id)
        ).to match_array([other_user.id, alternative_user.id])
      end

      it 'returns with unauthorized status' do
        expect(response.status).to eq(401)
      end

      it 'returns with unauthorized message' do
        expect(parsed_json['error']).to eq('401 Unauthorized')
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
