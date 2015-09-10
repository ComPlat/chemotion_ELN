require 'rails_helper'

describe Chemotion::SampleAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:user) }
    let!(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }
    let(:s1)    { create(:sample) }
    let(:s2)    { create(:sample) }

    before do
      CollectionsSample.create!(sample: s1, collection: c1)
      CollectionsSample.create!(sample: s2, collection: c1)
    end

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

    # not permission related endpoints
    describe 'GET /api/v1/samples' do
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
            molfile: ''
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

  end
end
