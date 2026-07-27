# frozen_string_literal: true

RSpec.describe Chemotion::AdminAPI do
  let!(:admin1) { create(:admin) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin1)
  end

  describe 'GET /api/v1/admin/jobs' do
    before do
      Delayed::Job.create(handler: 'Do something')
      get '/api/v1/admin/jobs'
    end

    it 'returns the right http status' do
      expect(response).to have_http_status :ok
    end

    it 'returns a response with jobs' do
      expect(parsed_json_response['jobs'].size).to eq 1
    end
  end

  describe 'PUT /api/v1/admin/jobs/restart' do
    it 'returns the right http status' do
      failed_job = Delayed::Job.create(failed_at: DateTime.now, handler: 'Do something')
      put '/api/v1/admin/jobs/restart', params: { id: failed_job.id }
      expect(response).to have_http_status :ok
    end
  end

  describe 'GET /api/v1/admin/listLocalCollector/all' do
    before do
      get '/api/v1/admin/listLocalCollector/all'
    end

    it 'returns the right http status' do
      expect(response).to have_http_status(:ok)
    end

    it 'returns a response with an array of collectors' do
      expect(parsed_json_response['listLocalCollector']).to be_a Array
    end
  end

  describe 'GET /api/v1/admin/users/byname' do
    let(:person) { create(:person) }
    let(:group) { create(:group) }
    let(:person_obj) { JSON.parse(Entities::UserSimpleEntity.new(person).to_json) }
    let(:group_obj) { JSON.parse(Entities::UserSimpleEntity.new(group).to_json) }

    describe 'with group type' do
      before do
        get "/api/v1/admin/users/byname?name=#{group.last_name[0..3]}&type=Group"
      end

      it 'returns the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a response with an array of groups' do
        expect(parsed_json_response['users']).to include(group_obj)
      end
    end

    describe 'with person type' do
      before do
        get "/api/v1/admin/users/byname?name=#{person.last_name[0..3]}&type=Person"
      end

      it 'returns the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a response with an array of people' do
        expect(parsed_json_response['users']).to include(person_obj)
      end
    end

    describe 'with person and group type' do
      before do
        get "/api/v1/admin/users/byname?name=#{person.last_name[0..3]}&type=Person,Group"
      end

      it 'returns the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a response with an array of people' do
        expect(parsed_json_response['users']).to include(person_obj)
      end
    end

    describe 'with no type' do
      before do
        get "/api/v1/admin/users/byname?name=#{person.last_name[0..3]}"
      end

      it 'returns the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a response with an array of people' do
        expect(parsed_json_response['users']).to include(person_obj)
      end
    end
  end

  describe 'POST /api/v1/admin/olsEnableDisable' do
    before do
      # Isolate the public-file writes; we only assert the HTTP contract here.
      allow(OlsTerm).to receive(:write_public_file)
      post '/api/v1/admin/olsEnableDisable/', params: { owl_name: 'chebi' }
    end

    # The fetcher (AdminFetcher.olsTermDisableEnable) treats success as status 204;
    # this pins that contract so a status change can't silently break the admin UI.
    it 'returns 204 No Content on success' do
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'PUT /api/v1/admin/group_device/update/:id (action: NodeAdm)' do
    let!(:group_admin) { create(:person) }
    let!(:second_admin) { create(:person) }
    let!(:member) { create(:person) }
    let!(:group) { create(:group, admins: [group_admin], users: [group_admin, member]) }

    def execute_request(admin_id:, set_admin:)
      put "/api/v1/admin/group_device/update/#{group.id}", params: {
        action: 'NodeAdm', rootType: 'Group', actionType: 'Adm',
        admin_id: admin_id, set_admin: set_admin
      }
    end

    it 'promotes a person to group admin' do
      execute_request(admin_id: member.id, set_admin: true)
      expect(group.reload.admins.pluck(:id)).to include(member.id)
    end

    it 'demotes a co-admin' do
      UsersAdmin.create!(user_id: group.id, admin_id: second_admin.id)

      execute_request(admin_id: second_admin.id, set_admin: false)

      expect(group.reload.admins.pluck(:id)).not_to include(second_admin.id)
      expect(group.reload.admins.pluck(:id)).to include(group_admin.id)
    end

    # Regression: this action predates GroupAPI's last_admin? guard (#3398) and had no
    # protection of its own, so a System Admin could demote a group's sole admin here.
    it 'refuses to demote the sole admin with 422' do
      execute_request(admin_id: group_admin.id, set_admin: false)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(group.reload.admins.pluck(:id)).to include(group_admin.id)
    end
  end

  describe 'PUT /api/v1/admin/group_device/update/:id (action: NodeDel)' do
    let!(:group_admin) { create(:person) }
    let!(:member) { create(:person) }
    let!(:group) { create(:group, admins: [group_admin, member], users: [group_admin, member]) }

    def execute_request(rm_users:)
      put "/api/v1/admin/group_device/update/#{group.id}", params: {
        action: 'NodeDel', rootType: 'Group', actionType: 'Person', rm_users: rm_users
      }
    end

    # Regression: this action used to also strip the target's admin relationship as a
    # side effect of removing membership, contradicting the invariant that group-admin
    # and group-member are independent (an admin who is also a member must keep their
    # admin role after being removed as a member here).
    it 'removes the membership but leaves the admin relationship intact' do
      execute_request(rm_users: [member.id])

      expect(group.reload.users.pluck(:id)).not_to include(member.id)
      expect(group.reload.admins.pluck(:id)).to include(member.id)
    end
  end
end
