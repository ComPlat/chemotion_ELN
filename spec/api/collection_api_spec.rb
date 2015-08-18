require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      include: [:children, :descendant_ids]
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:user) }
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

    describe 'POST /api/v1/collections/shared' do
      context 'with valid parameters' do
        let!(:params) {
          {
            collection_attributes: attributes_for(:collection, label: 'New'),
            user_ids: [user.id],
            sample_ids: []
          }
        }

        it 'creates a new, shared collection' do
          post '/api/v1/collections/shared', params

          c = Collection.find_by(label: 'New')
          expect(c).to_not be_nil
          expect(c.user_id).to eq(user.id)

          params[:collection_attributes].except(:user_id).each do |k, v|
            expect(c.attributes.symbolize_keys[k]).to eq(v)
          end
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
