require 'rails_helper'

describe Chemotion::WellplateAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
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
      context 'with appropriate permissions' do
        let(:c1) { create(:collection, user_id: user.id, is_shared: true, permission_level: 3) }
        let(:w1) { create(:wellplate, name: 'test') }

        before do
          CollectionsWellplate.create!(wellplate: w1, collection: c1)

          delete "/api/v1/wellplates/#{w1.id}"
        end

        it 'should be able to delete a wellplate by id' do
          wellplate = Wellplate.find_by(name: 'test')
          expect(wellplate).to be_nil
          array = Well.where(wellplate_id: w1.id)
          expect(array).to match_array([])
          array = CollectionsWellplate.where(wellplate_id: w1.id)
          expect(array).to match_array([])
        end

      end
    end
  end
end
