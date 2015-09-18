require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      methods: [:children, :descendant_ids, :permission_level, :sample_detail_level, :reaction_detail_level, :wellplate_detail_level]
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:user, name: 'Musashi') }
    let!(:c1)   { create(:collection, user: user, is_shared: false) }
    let!(:c2)   { create(:collection, user: user, shared_by_id: user.id, is_shared: true) }
    let!(:c3)   { create(:collection, is_shared: false) }
    let!(:c4)   { create(:collection, user: user, shared_by_id: user.id+1, is_shared: true) }
    let!(:c5)   { create(:collection, shared_by_id: user.id+1, is_shared: true) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/collections/roots' do
      it 'returns serialized (unshared) collection roots of logged in user' do
        get '/api/v1/collections/roots'

        expect(JSON.parse(response.body)['collections']).to eq [c1.as_json(json_options)]
      end
    end

    describe 'GET /api/v1/collections/shared_roots' do
      it 'returns serialized (shared) collection roots of logged in user' do
        get '/api/v1/collections/shared_roots'

        expect(JSON.parse(response.body)['collections']).to eq [c2.as_json(json_options)]
      end
    end

    describe 'GET /api/v1/collections/remote_roots' do
      it 'returns serialized (remote) collection roots of logged in user' do
        get '/api/v1/collections/remote_roots'

        expect(JSON.parse(response.body)['collections']).to eq [c4.as_json(json_options)]
      end
    end

    describe 'PUT /api/v1/collections/shared/:id' do
      let(:params) {
        {
          permission_level: 13,
          sample_detail_level: 5,
          reaction_detail_level: 2,
          wellplate_detail_level: 1
        }
      }

      before {
        put "/api/v1/collections/shared/#{c2.id}", params
        c2.reload
      }

      it 'updates permission and detail levels of specified shared collection' do
        expect(c2.permission_level).to eq 13
        expect(c2.sample_detail_level).to eq 5
        expect(c2.reaction_detail_level).to eq 2
        expect(c2.wellplate_detail_level).to eq 1
      end
    end

    describe 'POST /api/v1/collections/shared' do
      context 'with valid parameters' do
        let(:sample)    { create(:sample) }
        let!(:reaction) { create(:reaction) }

        let!(:params) {
          {
            collection_attributes: attributes_for(:collection),
            user_ids: [user.id],
            elements_filter: {
              sample: {
                all: false,
                included_ids: [sample.id],
                excluded_ids: []
              },
              reaction: {
                all: true,
                included_ids: [],
                excluded_ids: []
              }
            }
          }
        }

        before {
          post '/api/v1/collections/shared', params
        }

        it 'creates a new, shared collection' do
          c = Collection.find_by(label: 'My project with Musashi')
          expect(c).to_not be_nil
          expect(c.user_id).to eq(user.id)

          params[:collection_attributes].except(:user_id, :label).each do |k, v|
            expect(c.attributes.symbolize_keys[k]).to eq(v)
          end
        end

        it 'creates sample associations according to given params' do
          associated_sample_ids = Collection.find_by(label: 'My project with Musashi').sample_ids
          expect(associated_sample_ids).to match_array([sample.id])
        end

        it 'creates reaction associations according to given params' do
          associated_reaction_ids = Collection.find_by(label: 'My project with Musashi').reaction_ids
          expect(associated_reaction_ids).to match_array([reaction.id])
        end
      end
    end
  end

  context 'no user logged in' do
    describe 'GET /api/v1/collections/roots' do
      it 'responds with 401 status code' do
        get '/api/v1/collections/roots'
        expect(response.status).to eq(401)
      end
    end

    describe 'GET /api/v1/collections/shared_roots' do
      it 'responds with 401 status code' do
        get '/api/v1/collections/shared_roots'
        expect(response.status).to eq(401)
      end
    end

    describe 'POST /api/v1/collections/shared' do
      let(:params) {
        {
          collection_attributes: attributes_for(:collection, label: 'New'),
          user_ids: [1],
          sample_ids: []
        }
      }

      it 'does not create a new collection' do
        post '/api/v1/collections/shared', params

        expect(response.status).to eq(401)

        c = Collection.find_by(label: 'New')
        expect(c).to be_nil
      end
    end
  end
end
