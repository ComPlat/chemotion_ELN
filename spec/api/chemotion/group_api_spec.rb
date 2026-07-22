# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::GroupAPI do
  include_context 'api request authorization context'

  let(:group_admin) { create(:person) }
  let(:member) { create(:person) }
  let(:non_member) { create(:person) }
  let(:non_member_admin) { create(:person) }
  let(:admin_user) { create(:admin) }
  let!(:group) do
    create(
      :group, admins: [group_admin], users: [group_admin, member],
              first_name: 'Doe', last_name: 'Group Test'
    )
  end

  describe 'POST /api/v1/groups' do
    let(:params) do
      {
        first_name: 'My', last_name: 'Fanclub', email: 'jane.s@fan.club',
        name_abbreviation: 'JFC', users: [group_admin.id]
      }
    end
    let(:new_group) { Group.find_by(name_abbreviation: 'JFC') }

    before { post '/api/v1/groups', params: params }

    it 'creates a group of persons' do
      expect(new_group).to be_present
    end

    it 'adds the current user and the given users as members' do
      expect(new_group.users.pluck(:id)).to contain_exactly(user.id, group_admin.id)
    end

    it 'makes the creator the sole admin' do
      expect(new_group.admins.first).to eq(user)
      expect(user.administrated_accounts.where(name_abbreviation: 'JFC')).not_to be_empty
    end
  end

  describe 'GET /api/v1/groups' do
    let!(:own_group) { create(:group, admins: [user], users: [user], first_name: 'Own', last_name: 'Group') }

    before { get '/api/v1/groups' }

    it "returns only the current user's groups" do
      ids = parsed_json_response['currentGroups'].pluck('id')
      expect(ids).to include(own_group.id)
      expect(ids).not_to include(group.id)
    end
  end

  describe 'DELETE /api/v1/groups/:id' do
    subject(:execute_request) { delete "/api/v1/groups/#{group.id}" }

    context 'when called by the group admin' do
      let(:user) { group_admin }

      it 'destroys the group' do
        execute_request
        expect(Group.where(id: group.id)).to be_empty
        expect(parsed_json_response['destroyed_id']).to eq(group.id)
      end
    end

    context 'when called by a system Admin' do
      let(:user) { admin_user }

      it 'destroys the group' do
        execute_request
        expect(Group.where(id: group.id)).to be_empty
      end
    end

    context 'when called by a plain member' do
      let(:user) { member }

      it 'is unauthorized and does not destroy the group' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(Group.where(id: group.id)).not_to be_empty
      end
    end

    context 'when called by a non-member' do
      let(:user) { non_member }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when called by an admin who is not a member' do
      let!(:group) do
        create(:group, admins: [group_admin, non_member_admin], users: [group_admin, member])
      end
      let(:user) { non_member_admin }

      it 'destroys the group' do
        execute_request
        expect(Group.where(id: group.id)).to be_empty
      end
    end

    context 'when the group does not exist' do
      let(:user) { group_admin }

      it 'returns 404' do
        delete '/api/v1/groups/0'
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'POST /api/v1/groups/:id/members' do
    subject(:execute_request) { post "/api/v1/groups/#{group.id}/members", params: params, as: :json }

    let(:params) { { user_ids: [non_member.id] } }

    context 'when called by the group admin' do
      let(:user) { group_admin }

      it 'adds the members' do
        execute_request
        expect(group.reload.users.pluck(:id)).to include(non_member.id)
      end
    end

    context 'when called by a system Admin' do
      let(:user) { admin_user }

      it 'adds the members' do
        execute_request
        expect(group.reload.users.pluck(:id)).to include(non_member.id)
      end
    end

    context 'when called by a plain member' do
      let(:user) { member }

      it 'is unauthorized and does not add the members' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(group.reload.users.pluck(:id)).not_to include(non_member.id)
      end
    end

    context 'when called by a non-member' do
      let(:user) { non_member }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when called by an admin who is not a member' do
      let!(:group) do
        create(:group, admins: [group_admin, non_member_admin], users: [group_admin, member])
      end
      let(:user) { non_member_admin }

      it 'adds the members' do
        execute_request
        expect(group.reload.users.pluck(:id)).to include(non_member.id)
      end
    end
  end

  describe 'DELETE /api/v1/groups/:id/members/:user_id' do
    subject(:execute_request) { delete "/api/v1/groups/#{group.id}/members/#{target.id}" }

    context 'when the group admin removes another member' do
      let(:user) { group_admin }
      let(:target) { member }

      it 'removes the member' do
        execute_request
        expect(group.reload.users.pluck(:id)).not_to include(member.id)
      end
    end

    context 'when called by a system Admin' do
      let(:user) { admin_user }
      let(:target) { member }

      it 'removes the member' do
        execute_request
        expect(group.reload.users.pluck(:id)).not_to include(member.id)
      end
    end

    context 'when a member removes themself (leave)' do
      let(:user) { member }
      let(:target) { member }

      it 'removes self from the group' do
        execute_request
        expect(group.reload.users.pluck(:id)).not_to include(member.id)
      end
    end

    context 'when the removed member is also an admin (not the last one)' do
      let!(:group) do
        create(:group, admins: [group_admin, second_admin], users: [group_admin, second_admin, member])
      end
      let(:second_admin) { create(:person) }
      let(:user) { group_admin }
      let(:target) { second_admin }

      it 'also revokes the admin relationship so no orphaned admin remains' do
        execute_request
        expect(group.reload.users.pluck(:id)).not_to include(second_admin.id)
        expect(group.reload.admins.pluck(:id)).not_to include(second_admin.id)
      end
    end

    context 'when removing the sole remaining admin via the members endpoint' do
      let(:user) { group_admin }
      let(:target) { group_admin }

      it 'refuses with 422 and keeps the member and admin' do
        execute_request
        expect(response).to have_http_status(:unprocessable_entity)
        expect(group.reload.users.pluck(:id)).to include(group_admin.id)
        expect(group.reload.admins.pluck(:id)).to include(group_admin.id)
      end
    end

    context 'when a plain member tries to remove someone else' do
      let(:user) { member }
      let(:target) { group_admin }

      it 'is unauthorized and does not remove the target' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(group.reload.users.pluck(:id)).to include(group_admin.id)
      end
    end

    context 'when called by a non-member' do
      let(:user) { non_member }
      let(:target) { member }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when called by an admin who is not a member' do
      let!(:group) do
        create(:group, admins: [group_admin, non_member_admin], users: [group_admin, member])
      end
      let(:user) { non_member_admin }
      let(:target) { member }

      it 'removes the member' do
        execute_request
        expect(group.reload.users.pluck(:id)).not_to include(member.id)
      end
    end
  end

  describe 'POST /api/v1/groups/:id/admins/:user_id' do
    subject(:execute_request) { post "/api/v1/groups/#{group.id}/admins/#{member.id}" }

    context 'when called by the group admin' do
      let(:user) { group_admin }

      it 'promotes the member to admin' do
        execute_request
        expect(group.reload.admins.pluck(:id)).to include(member.id)
      end
    end

    context 'when called by a system Admin' do
      let(:user) { admin_user }

      it 'promotes the member to admin' do
        execute_request
        expect(group.reload.admins.pluck(:id)).to include(member.id)
      end
    end

    context 'when called by a plain member' do
      let(:user) { member }

      it 'is unauthorized and does not promote' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(group.reload.admins.pluck(:id)).not_to include(member.id)
      end
    end

    context 'when called by an admin who is not a member' do
      let!(:group) do
        create(:group, admins: [group_admin, non_member_admin], users: [group_admin, member])
      end
      let(:user) { non_member_admin }

      it 'promotes the member to admin' do
        execute_request
        expect(group.reload.admins.pluck(:id)).to include(member.id)
      end
    end
  end

  describe 'DELETE /api/v1/groups/:id/admins/:user_id' do
    subject(:execute_request) { delete "/api/v1/groups/#{group.id}/admins/#{target.id}" }

    context 'when the group has more than one admin' do
      let!(:group) do
        create(:group, admins: [group_admin, second_admin], users: [group_admin, second_admin, member])
      end
      let(:second_admin) { create(:person) }
      let(:user) { group_admin }
      let(:target) { second_admin }

      it 'demotes the target admin' do
        execute_request
        expect(group.reload.admins.pluck(:id)).not_to include(second_admin.id)
      end
    end

    context 'when the target is the sole remaining admin' do
      let(:user) { group_admin }
      let(:target) { group_admin }

      it 'refuses with 422 and keeps the admin' do
        execute_request
        expect(response).to have_http_status(:unprocessable_entity)
        expect(group.reload.admins.pluck(:id)).to include(group_admin.id)
      end
    end

    context 'when called by a plain member' do
      let(:user) { member }
      let(:target) { group_admin }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when called by an admin who is not a member' do
      let!(:group) do
        create(:group, admins: [group_admin, non_member_admin], users: [group_admin, member])
      end
      let(:user) { non_member_admin }
      let(:target) { group_admin }

      it 'demotes the target admin' do
        execute_request
        expect(group.reload.admins.pluck(:id)).not_to include(group_admin.id)
      end
    end
  end
end
