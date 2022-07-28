# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SyncCollectionAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:alternative_user) { create(:person) }
  let(:group) { create(:group, first_name: 'Group', users: [user, other_user], last_name: 'One Two', name_abbreviation: 'G1_2x') }

  let(:collection) { create(:collection, user_id: user.id, is_shared: false, permission_level: 0, label: "U1x's collection") }
  let(:other_collection) { create(:collection, user_id: other_user.id, is_shared: nil, permission_level: 0, label: "U2x's collection") }

  let(:shared_collection) { create(:collection, user_id: other_user.id, is_shared: true, shared_by_id: user.id, is_locked: true, permission_level: 0, label: 'shared by user') }
  let(:other_shared_collection) { create(:collection, user_id: user.id, is_shared: true, shared_by_id: other_user.id, is_locked: true, permission_level: 0, label: 'shared by other user') }
  let(:shared_collection_to_group) { create(:collection, user_id: group.id, is_shared: true, shared_by_id: other_user.id, is_locked: true, permission_level: 0, label: 'shared by other user to group') }

  let(:sync_collections_user) { create(:sync_collections_user, collection_id: collection.id, user_id: other_user.id, permission_level: 0, shared_by_id: user.id, fake_ancestry: shared_collection.id.to_s) }
  let(:other_sync_collections_user) { create(:sync_collections_user, collection_id: other_collection.id, user_id: user.id, permission_level: 0, shared_by_id: other_user.id, fake_ancestry: other_shared_collection.id.to_s) }
  let!(:sync_collections_user_to_group) { create(:sync_collections_user, collection_id: other_collection.id, user_id: group.id, permission_level: 0, shared_by_id: other_user.id, fake_ancestry: shared_collection_to_group.id.to_s) }

  let(:json_options) do
    {
      only: %i[id permission_level sample_detail_level reaction_detail_level
               wellplate_detail_level screen_detail_level]
    }
  end

  describe 'GET /api/v1/syncCollections/{id}' do
    before do
      get  format('/api/v1/syncCollections/%i', sync_collections_user_id)
    end

    context 'when on a outgoing sync_collection' do
      let(:sync_collections_user_id) { sync_collections_user.id }

      it 'does not return the sync_collections_user' do
        expect(response.status).to be 404
        expect(parsed_json_response['error']).not_to be_empty
      end
    end

    context 'when on a incoming sync_collection' do
      let(:sync_collections_user_id) { other_sync_collections_user.id }

      it 'does return the sync_collections_user' do
        expect(parsed_json_response['sync_collections_user']).not_to be_empty
        expect(parsed_json_response['sync_collections_user']).to include(other_sync_collections_user.as_json(json_options))
      end
    end

    context 'when user not logged in' do
      let(:sync_collections_user_id) { sync_collections_user.id }

      it 'responds with 401 status code' do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(nil)

        get format('/api/v1/syncCollections/%i', sync_collections_user_id)
        expect(response.status).to eq(401)
      end
    end
  end

  describe 'POST /api/v1/syncCollections/take_ownership/{id}' do
    context 'when permissions are appropriate' do
      before do
        other_sync_collections_user.update!(permission_level: 5)
        post "/api/v1/syncCollections/take_ownership/#{other_sync_collections_user.id}"
      end

      it 'is allowed' do
        expect(response.status).to eq 201
      end

      it 'changes the ownership of the other_collection' do
        other_collection.reload
        expect(other_collection.user_id).to eq(user.id)
      end

      it 'swaps the user and sharer of sync_collection' do
        other_sync_collections_user.reload
        expect(other_sync_collections_user.user_id).to eq(other_user.id)
        expect(other_sync_collections_user.shared_by_id).to eq(user.id)
      end

      it 'returns success message' do
        expect(parsed_json_response['success']).to eq(true)
      end
    end

    context 'when permissions are inappropriate' do
      before do
        other_sync_collections_user.update!(permission_level: 4)
        post "/api/v1/syncCollections/take_ownership/#{other_sync_collections_user.id}"
      end

      it 'is not allowed' do
        expect(response.status).to eq 401
      end
    end
  end

  describe 'GET /api/v1/syncCollections/sync_remote_roots' do
    before do
      other_sync_collections_user
      sync_collections_user_to_group
      get '/api/v1/syncCollections/sync_remote_roots'
    end

    it 'returns serialized incoming sync_collections_users roots of logged in user' do
      expect(parsed_json_response['syncCollections']).not_to be_empty
      roots = parsed_json_response['syncCollections'].select do |root|
        root['id'] == other_shared_collection.id
      end
      expect(roots).not_to be_empty
      sc = roots[0]['children'].select do |child|
        child['id'] == other_sync_collections_user.id
      end
      expect(sc).not_to be_empty
      expect(sc[0]).to include other_sync_collections_user.as_json(json_options)
    end

    it 'returns serialized incoming sync_collections_users roots of logged in user sync thru a group' do
      expect(parsed_json_response['syncCollections']).not_to be_empty
      roots = parsed_json_response['syncCollections'].select do |root|
        root['id'] == shared_collection_to_group.id
      end
      expect(roots).not_to be_empty
      sc = roots[0]['children'].select do |child|
        child['id'] == sync_collections_user_to_group.id
      end
      expect(sc).not_to be_empty
      expect(sc[0]).to include sync_collections_user_to_group.as_json(json_options)
    end

    context 'when user not logged in' do
      it 'responds with 401 status code' do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(nil)
        get '/api/v1/syncCollections/sync_remote_roots'
        expect(response.status).to eq(401)
      end
    end
  end

  describe 'PUT /api/v1/syncCollections/{id}' do
    let(:params) do
      {
        collection_attributes: {
          permission_level: 5,
          sample_detail_level: 5,
          reaction_detail_level: 2,
          wellplate_detail_level: 1,
          screen_detail_level: 5,
          element_detail_level: 10
        }
      }
    end

    before do
      put "/api/v1/syncCollections/#{sync_collections_user.id}", params: params
      sync_collections_user.reload
    end

    it 'updates permission and detail levels of specified sync collection' do
      expect(sync_collections_user.permission_level).to eq(5)
      expect(sync_collections_user.sample_detail_level).to eq(5)
      expect(sync_collections_user.reaction_detail_level).to eq(2)
      expect(sync_collections_user.wellplate_detail_level).to eq(1)
      expect(sync_collections_user.screen_detail_level).to eq(5)
    end

    it 'returns a sync_collections_user' do
      expect(parsed_json_response['sync_collections_user']['permission_level']).to eq(5)
      expect(parsed_json_response['sync_collections_user']['sample_detail_level']).to eq(5)
      expect(parsed_json_response['sync_collections_user']['reaction_detail_level']).to eq(2)
      expect(parsed_json_response['sync_collections_user']['wellplate_detail_level']).to eq(1)
      expect(parsed_json_response['sync_collections_user']['screen_detail_level']).to eq(5)
    end
  end

  describe 'POST /api/v1/syncCollections' do
    let(:params) do
      {
        collection_attributes: {
          permission_level: 3,
          sample_detail_level: 5,
          reaction_detail_level: 2,
          wellplate_detail_level: 1,
          screen_detail_level: 5,
          element_detail_level: 5
        },
        id: collection.id,
        user_ids: [
          { value: other_user.id },
          { value: alternative_user.email }
        ]
      }
    end

    context 'when everything is ok' do
      before do
        post '/api/v1/syncCollections', params: params
      end

      it 'returns a string with null' do
        expect(response.status).to eq(201)
        expect(response.body).to eq('null')
      end
    end

    context 'when something is top_secret' do
      let(:top_secret_sample) { create(:sample, is_top_secret: true) }

      before do
        collection.samples << top_secret_sample
        post '/api/v1/syncCollections', params: params
      end

      it 'returns an error' do
        expect(response.status).to eq(401)
        expect(parsed_json_response['error']).to eq('401 Unauthorized')
      end
    end
  end

  describe 'DELETE /api/v1/syncCollections/{id}' do
    pending 'TODO: Add missing spec'
  end
end
