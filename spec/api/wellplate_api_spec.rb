require 'rails_helper'

describe Chemotion::WellplateAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:user) }

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
  end
end
