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

        it 'should be able to delete a wellplate by id' do
          wellplate = Wellplate.create(name: 'test')
          wellplate.reload
          wellplate_id = wellplate.id
          CollectionsWellplate.create(wellplate_id: wellplate_id, collection_id: 1)
          delete "/api/v1/wellplates/#{wellplate_id}", { id: wellplate_id }
          wellplate = Wellplate.find_by(name: 'test')
          expect(wellplate).to be_nil
          array = Well.where(wellplate_id: wellplate_id)
          expect(array).to match_array([])
          array = CollectionsWellplate.where(wellplate_id: wellplate_id)
          expect(array).to match_array([])
        end

      end

      context 'with UIState' do

        let!(:wellplate_1) { create(:wellplate, name: 'test_1')}
        let!(:wellplate_2) { create(:wellplate, name: 'test_2')}
        let!(:wellplate_3) { create(:wellplate, name: 'test_3')}

        let!(:params_all_false) {
          {
            all: nil,
            included_ids: [wellplate_1.id, wellplate_2.id],
            excluded_ids: []
          }
        }

        let!(:params_all_true) {
          {
            all: true,
            included_ids: [],
            excluded_ids: [wellplate_3.id]
          }
        }

        it 'should be able to delete wellplates when "all" is false' do
          wellplate_ids = [wellplate_1.id, wellplate_2.id]
          array = Wellplate.where(id: wellplate_ids).to_a
          expect(array).to match_array([wellplate_1, wellplate_2])
          CollectionsWellplate.create(wellplate_id: wellplate_1.id, collection_id: 1)
          CollectionsWellplate.create(wellplate_id: wellplate_2.id, collection_id: 1)
          w = Wellplate.find_by(id: wellplate_3.id)
          expect(w).to_not be_nil
          delete '/api/v1/wellplates', { ui_state: params_all_false }
          w = Wellplate.find_by(id: wellplate_3.id)
          expect(w).to_not be_nil
          array = Wellplate.where(id: wellplate_ids).to_a
          expect(array).to match_array([])
          array = Well.where(wellplate_id: wellplate_ids).to_a
          expect(array).to match_array([])
          array = CollectionsWellplate.where(wellplate_id: wellplate_ids)
          expect(array).to match_array([])
        end

        it 'should be able to delete wellplates when "all" is false' do
          wellplate_ids = [wellplate_1.id, wellplate_2.id]
          array = Wellplate.where(id: wellplate_ids).to_a
          expect(array).to match_array([wellplate_1, wellplate_2])
          CollectionsWellplate.create(wellplate_id: wellplate_1.id, collection_id: 1)
          CollectionsWellplate.create(wellplate_id: wellplate_2.id, collection_id: 1)
          w = Wellplate.find_by(id: wellplate_3.id)
          expect(w).to_not be_nil
          delete '/api/v1/wellplates', { ui_state: params_all_true }
          w = Wellplate.find_by(id: wellplate_3.id)
          expect(w).to_not be_nil
          array = Wellplate.where(id: wellplate_ids).to_a
          expect(array).to match_array([])
          array = Well.where(wellplate_id: wellplate_ids).to_a
          expect(array).to match_array([])
          array = CollectionsWellplate.where(wellplate_id: wellplate_ids)
          expect(array).to match_array([])
        end

      end
    end

  end
end
