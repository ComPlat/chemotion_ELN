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
end
