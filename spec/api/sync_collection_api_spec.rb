# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SyncCollectionAPI do
  let(:json_options) do
    {
      only: %i[id permission_level sample_detail_level reaction_detail_level
               wellplate_detail_level screen_detail_level]
    }
  end

  let!(:u1) { create(:person, first_name: 'User', last_name: 'One', name_abbreviation: 'U1x') }
  let!(:u2) { create(:person, first_name: 'User', last_name: 'Two', name_abbreviation: 'U2x') }
  let!(:g1) { create(:group, first_name: 'Group', users: [u1, u2], last_name: 'One Two', name_abbreviation: 'G1_2x') }

  let!(:c1) { create(:collection, user_id: u1.id, is_shared: nil, permission_level: 0, label: "U1x's collection") }
  let!(:c2) { create(:collection, user_id: u2.id, is_shared: nil, permission_level: 0, label: "U2x's collection") }
  # root shared collections
  let!(:c1_2) { create(:collection, user_id: u2.id, is_shared: true, shared_by_id: u1.id, is_locked: true, permission_level: 0, label: 'shared by U1x') }
  let!(:c2_1) { create(:collection, user_id: u1.id, is_shared: true, shared_by_id: u2.id, is_locked: true, permission_level: 0, label: 'shared by U2x') }
  let!(:cg1_2) { create(:collection, user_id: g1.id, is_shared: true, shared_by_id: u2.id, is_locked: true, permission_level: 0, label: 'shared by U2x to G1') }

  let!(:sc1_2) { create(:sync_collections_user, collection_id: c1.id, user_id: u2.id, permission_level: 0, shared_by_id: u1.id, fake_ancestry: c1_2.id.to_s) }
  let!(:sc2_1) { create(:sync_collections_user, collection_id: c2.id, user_id: u1.id, permission_level: 0, shared_by_id: u2.id, fake_ancestry: c2_1.id.to_s) }
  let!(:scg1_2) { create(:sync_collections_user, collection_id: c2.id, user_id: g1.id, permission_level: 0, shared_by_id: u2.id, fake_ancestry: cg1_2.id.to_s) }

  let!(:s1) { create(:sample, name: 'sample 1') }
  let!(:s2) { create(:sample, name: 'sample 2') }
  let!(:s3) { create(:sample, name: 'sample 3') }

  context 'when authorized user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(u1)
    end

    describe 'GET /api/v1/syncCollections/:id, ' do
      context 'on a outgoing sync_collection,' do
        before do
          get  format('/api/v1/syncCollections/%i', sc1_2.id)
        end

        it 'does not return the sync_collections_user' do
          response_body = JSON.parse response.body
          expect(response.status).to be 404
          expect(response_body['error']).not_to be_empty
        end
      end

      context ', on a incoming sync_collection,' do
        before do
          get  format('/api/v1/syncCollections/%i', sc2_1.id)
        end

        it 'does return the sync_collections_user' do
          response_body = JSON.parse response.body
          expect(response.body['sync_collections_user']).not_to be_empty
          expect(response_body['sync_collections_user']).to include(sc2_1.as_json(json_options))
        end
      end
    end

    describe 'POST /api/v1/syncCollections/take_ownership/:id' do
      context 'with appropriate permissions' do
        describe 'take ownership of c1' do
          before do
            sc2_1.update!(permission_level: 5)
            post "/api/v1/syncCollections/take_ownership/#{sc2_1.id}"
          end

          it 'is allowed' do
            expect(response.status).to eq 201
          end

          it 'changes the ownership of the collection' do
            c2.reload
            expect(c2.user_id).to eq u1.id
          end

          it 'swaps the user and sharer of sync_collection' do
            sc2_1.reload
            expect(sc2_1.user_id).to eq u2.id
            expect(sc2_1.shared_by_id).to eq u1.id
          end
        end
      end

      context 'with inappropriate permissions' do
        describe 'take ownership of c1' do
          before do
            sc2_1.update!(permission_level: 4)
            post "/api/v1/syncCollections/take_ownership/#{sc2_1.id}"
          end

          it 'is not allowed' do
            expect(response.status).to eq 401
          end
        end
      end
    end

    describe 'GET /api/v1/syncCollections/sync_remote_roots' do
      before do
        get '/api/v1/syncCollections/sync_remote_roots'
      end

      it 'returns serialized incoming sync_collections_users roots of logged in user' do
        response_body = JSON.parse(response.body)
        expect(response_body['syncCollections']).not_to be_empty
        roots = response_body['syncCollections'].select do |root|
          root['id'] == c2_1.id
        end
        expect(roots).not_to be_empty
        sc = roots[0]['children'].select do |child|
          child['id'] == sc2_1.id
        end
        expect(sc).not_to be_empty
        expect(sc[0]).to include sc2_1.as_json(json_options)
      end

      it 'returns serialized incoming sync_collections_users roots of logged in user sync thru a group' do
        response_body = JSON.parse(response.body)
        expect(response_body['syncCollections']).not_to be_empty
        roots = response_body['syncCollections'].select do |root|
          root['id'] == cg1_2.id
        end
        expect(roots).not_to be_empty
        sc = roots[0]['children'].select do |child|
          child['id'] == scg1_2.id
        end
        expect(sc).not_to be_empty
        expect(sc[0]).to include scg1_2.as_json(json_options)
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
            screen_detail_level: 5
          }
        }
      end

      before do
        post '/api/v1/syncCollections', params: params
      end

      it 'creates a new sync_collections_user' do
      end
    end

    describe 'PUT /api/v1/syncCollections/:id' do
      let(:params) do
        {
          collection_attributes: {
            permission_level: 5,
            sample_detail_level: 5,
            reaction_detail_level: 2,
            wellplate_detail_level: 1,
            screen_detail_level: 5
          }
        }
      end

      before do
        put "/api/v1/syncCollections/#{sc1_2.id}", params: params
        sc1_2.reload
      end

      it 'updates permission and detail levels of specified sync collection' do
        expect(sc1_2.permission_level).to eq 5
        expect(sc1_2.sample_detail_level).to eq 5
        expect(sc1_2.reaction_detail_level).to eq 2
        expect(sc1_2.wellplate_detail_level).to eq 1
        expect(sc1_2.screen_detail_level).to eq 5
      end
    end
  end

  context 'no user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(nil)
    end

    describe 'GET /api/v1/syncCollections/:id' do
      it 'responds with 401 status code' do
        get format('/api/v1/syncCollections/%i', sc1_2.id)
        expect(response.status).to eq(401)
      end
    end

    describe 'GET /api/v1/syncCollections/sync_remote_roots' do
      it 'responds with 401 status code' do
        get '/api/v1/syncCollections/sync_remote_roots'
        expect(response.status).to eq(401)
      end
    end
  end
end
