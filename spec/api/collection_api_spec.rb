require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      include: :children
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:user) }
    let!(:c1)   { create(:collection, user: user, is_shared: false) }
    let!(:c2)   { create(:collection, user: user, is_shared: true) }
    let!(:c3)   { create(:collection, is_shared: false) }
    let!(:c4)   { create(:collection, is_shared: true) }

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
  end
end
