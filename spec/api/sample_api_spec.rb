require 'rails_helper'

describe Chemotion::SampleAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:user) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    # Permission related are reading and updating of a sample
    describe 'GET /api/v1/samples/:id' do
      context 'with appropriate permissions' do
        let!(:c)      { create(:collection, user_id: user.id) }
        let!(:sample) { create(:sample) }

        before do
          CollectionsSample.create!(sample: sample, collection: c)

          get "/api/v1/samples/#{sample.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized sample' do
          expect(JSON.parse(response.body)['sample']['name']).to eq sample.name
        end
      end

      context 'with inappropriate permissions' do
        let!(:c)      { create(:collection, user_id: user.id + 1) }
        let!(:sample) { create(:sample) }

        before do
          CollectionsSample.create!(sample: sample, collection: c)

          get "/api/v1/samples/#{sample.id}"
        end

        it 'returns 401 unauthorized status code' do
          expect(response.status).to eq 401
        end
      end
    end

    describe 'PUT /api/v1/samples/:id' do
      context 'with appropriate permissions' do
        let(:c1) { create(:collection, user_id: user.id) }
        let(:c2) { create(:collection, user_id: user.id + 1) }
        let(:c3) { create(:collection, user_id: user.id, is_shared: true, permission_level: 1) }
        let(:s1) { create(:sample, name: 'old', amount_value: 0.1) }
        let(:s2) { create(:sample, name: 'old2', amount_value: 0.2) }

        let(:params) {
          {
            name: 'updated name',
            amount_value: 0,
            amount_unit: 'g',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            impurities: '',
            location: '',
            molfile: '',
            is_top_secret: false
          }
        }

        before do
          CollectionsSample.create!(sample: s1, collection: c1)
          CollectionsSample.create!(sample: s1, collection: c2)
          CollectionsSample.create!(sample: s2, collection: c3)
        end

        describe 'updating sample 1' do
          before { put "/api/v1/samples/#{s1.id}", params }

          it 'returns 200 status code' do
            expect(response.status).to eq 200
          end

          it 'updates sample' do
            s = Sample.find_by(name: 'updated name')
            expect(s).to_not be_nil
            expect(s.amount_value).to eq 0
          end
        end

        describe 'updating sample 2' do
          before { put "/api/v1/samples/#{s2.id}", params }

          it 'returns 200 status code' do
            expect(response.status).to eq 200
          end

          it 'updates sample' do
            s = Sample.find_by(name: 'updated name')
            expect(s).to_not be_nil
            expect(s.amount_value).to eq 0
          end
        end
      end

      context 'with inappropriate permissions' do
        let(:c)      { create(:collection, user_id: user.id + 1) }
        let(:sample) { create(:sample) }
        let(:params) {
          {
            name: 'updated name',
            amount_value: 0,
            amount_unit: 'g',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            impurities: '',
            location: '',
            molfile: '',
            is_top_secret: false
          }
        }

        before do
          CollectionsSample.create!(sample: sample, collection: c)

          put "/api/v1/samples/#{sample.id}", params
        end

        it 'returns 401 unauthorized status code' do
          expect(response.status).to eq 401
        end
      end
    end

    # not permission related endpoints
    describe 'GET /api/v1/samples' do
      let!(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:s1)    { create(:sample) }
      let(:s2)    { create(:sample) }

      before do
        CollectionsSample.create!(sample: s1, collection: c1)
        CollectionsSample.create!(sample: s2, collection: c1)
      end

      it 'returns serialized (unshared) samples roots of logged in user' do
        get '/api/v1/samples'

        samples = JSON.parse(response.body)['samples']
        expect(samples.first.symbolize_keys).to include(
          id: s2.id,
          name: s2.name,
          type: 'sample',
          collection_labels: ['C1']
        )
        expect(samples.last.symbolize_keys).to include(
          id: s1.id,
          name: s1.name,
          type: 'sample',
          collection_labels: ['C1']
        )
      end
    end

    describe 'POST /api/v1/samples' do
      context 'with valid parameters' do
        let(:params) {
          {
            name: 'test',
            amount_value: 0,
            amount_unit: 'g',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            impurities: '',
            location: '',
            molfile: '',
            is_top_secret: false
          }
        }

        before { post '/api/v1/samples', params }

        it 'should be able to create a new sample' do
          s = Sample.find_by(name: 'test')
          expect(s).to_not be_nil

          params.each do |k, v|
            expect(s.attributes.symbolize_keys[k]).to eq(v)
          end
        end
      end
    end

    describe 'DELETE /api/v1/samples' do
      context 'with valid parameters' do

        let!(:params) {
          {
            name: 'test',
            amount_value: 0,
            amount_unit: 'g',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            impurities: '',
            location: '',
            molfile: ''
          }
        }

        it 'should be able to delete a sample' do
          post '/api/v1/samples', params
          s = Sample.find_by(name: 'test')
          expect(s).to_not be_nil
          sample_id = s.id
          CollectionsSample.create(sample_id: s.id, collection_id: 1)
          delete '/api/v1/samples', { id: sample_id}
          s = Sample.find_by(name: 'test')
          expect(s).to be_nil
          a = Well.where(sample_id: sample_id)
          expect(a).to match_array([])
          a = CollectionsSample.where(sample_id: sample_id)
          expect(a).to match_array([])
          a = ReactionsProductSample.where(sample_id: sample_id)
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(sample_id: sample_id)
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(sample_id: sample_id)
          expect(a).to match_array([])
        end

      end
    end

  end
end
