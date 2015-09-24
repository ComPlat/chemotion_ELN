require 'rails_helper'

describe Chemotion::WellplateAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    # Permission related are reading and updating of a sample
    describe 'GET /api/v1/wellplates/:id' do
      context 'with appropriate permissions' do
        let(:c1) { create(:collection, user_id: user.id) }
        let(:w1) { create(:wellplate) }

        before do
          CollectionsWellplate.create!(wellplate: w1, collection: c1)

          get "/api/v1/wellplates/#{w1.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end
      end

      context 'with inappropriate permissions' do
        let(:c1) { create(:collection, user_id: user.id + 1) }
        let(:w1) { create(:wellplate) }

        before do
          CollectionsWellplate.create!(wellplate: w1, collection: c1)

          get "/api/v1/wellplates/#{w1.id}"
        end

        it 'returns 401 unauthorized status code' do
          expect(response.status).to eq 401
        end
      end
    end

    describe 'DELETE /api/v1/wellplates' do
      context 'with valid parameters' do

        it 'should be able to delete a wellplate' do
          w = Wellplate.create(name: 'test')
          wellplate_id = w.id
          CollectionsWellplate.create(wellplate_id: w.id, collection_id: 1)
          delete '/api/v1/wellplates', { id: wellplate_id }
          w = Wellplate.find_by(name: 'test')
          expect(w).to be_nil
          a = Well.where(wellplate_id: wellplate_id)
          expect(a).to match_array([])
          a = CollectionsWellplate.where(wellplate_id: wellplate_id)
          expect(a).to match_array([])
        end

      end
    end
  end
end
