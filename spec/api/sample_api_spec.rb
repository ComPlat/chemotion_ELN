require 'rails_helper'

describe Chemotion::SampleAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/samples/ui_state/' do
      context 'with appropriate permissions' do
        let(:c)        { create(:collection, user_id: user.id) }
        let(:sample_1) { create(:sample) }
        let(:sample_2) { create(:sample) }
        let(:limit)    { 1 }

        let(:params) {
          {
            ui_state: {
              all: false,
              included_ids: [sample_1.id, sample_2.id],
              excluded_ids: [],
              collection_id: c.id
            }
          }
        }

        let(:params_with_limit) {
          {
            ui_state: {
              all: false,
              included_ids: [sample_1.id, sample_2.id],
              excluded_ids: [],
              collection_id: c.id
            },
            limit: limit
          }
        }

        before do
          CollectionsSample.create!(sample: sample_1, collection: c)
          CollectionsSample.create!(sample: sample_2, collection: c)
        end

        describe "limit param given" do
          before { post "/api/v1/samples/ui_state/", params_with_limit }

          it "fetches less or equal than limit samples" do
            expect(JSON.parse(response.body)['samples'].size).to be <= limit
          end
        end

        describe "limit param not given" do
          before { post "/api/v1/samples/ui_state/", params }

          it "fetches all samples for given ui_state" do
            expect(JSON.parse(response.body)['samples'].size).to eq 2
          end
        end
      end
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
        let(:s1) { create(:sample, name: 'old', target_amount_value: 0.1) }
        let(:s2) { create(:sample, name: 'old2', target_amount_value: 0.2) }

        let(:params) {
          {
            name: 'updated name',
            target_amount_value: 0,
            target_amount_unit: 'g',
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
            expect(s.target_amount_value).to eq 0
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
            expect(s.target_amount_value).to eq 0
          end
        end
      end

      context 'with inappropriate permissions' do
        let(:c)      { create(:collection, user_id: user.id + 1) }
        let(:sample) { create(:sample) }
        let(:params) {
          {
            name: 'updated name',
            target_amount_value: 0,
            target_amount_unit: 'g',
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
      let!(:c) { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:s)  { create(:sample) }

      before do
        CollectionsSample.create!(sample: s, collection: c)
      end

      it 'returns serialized (unshared) samples roots of logged in user' do
        get '/api/v1/samples'
        first_sample = JSON.parse(response.body)['molecules'].first['samples'].first
        expect(first_sample.symbolize_keys).to include(
          id: s.id,
          name: s.name,
          type: 'sample',
          #collection_labels: [{"name" => 'C1', "is_shared" => false, "id"=>c.id}]
        )
        expect(first_sample["collection_labels"]).to include({
          "name" => 'C1', "is_shared" => false, "id"=>c.id,
          "user_id" => user.id, "shared_by_id" => c.shared_by_id,
          "is_synchronized" => c.is_synchronized
        })
      end
    end

    describe 'POST /api/v1/samples' do
      context 'with valid parameters' do
        let(:params) {
          {
            name: 'test',
            target_amount_value: 0,
            target_amount_unit: 'g',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            impurities: '',
            location: '',
            density: 0.5,
            boiling_point: 100,
            melting_point: 200,
          #  molecule: FactoryGirl.create(:molecule),
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

        it 'should set the creator' do
          s = Sample.find_by(name: 'test')
          expect(s.creator).to eq(user)
        end
      end
    end

    describe 'DELETE /api/v1/samples' do
      context 'with valid parameters' do
        let(:c1) { create(:collection, user: user) }
        let(:s1) { create(:sample, name: 'test') }

        let!(:params) {
          {
            name: 'test',
            target_amount_value: 0,
            target_amount_unit: 'g',
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
          CollectionsSample.create!(collection: c1, sample: s1)
          delete "/api/v1/samples/#{s1.id}"
        end

        it 'should be able to delete a sample' do
          s = Sample.find_by(name: 'test')
          expect(s).to be_nil
        end
      end

      context 'with UIState' do
        let!(:sample_1) { create(:sample, name: 'test_1')}
        let!(:sample_2) { create(:sample, name: 'test_2')}
        let!(:sample_3) { create(:sample, name: 'test_3')}

        let!(:params_all_false) {
          {
            all: false,
            included_ids: [sample_1.id, sample_2.id],
            excluded_ids: []
          }
        }

        let!(:params_all_true) {
          {
            all: true,
            included_ids: [],
            excluded_ids: [sample_3.id]
          }
        }

        xit 'should be able to delete samples when "all" is false' do
          sample_ids = [sample_1.id, sample_2.id]
          array = Sample.where(id: sample_ids).to_a
          expect(array).to match_array([sample_1, sample_2])
          CollectionsSample.create(sample_id: sample_1.id, collection_id: 1)
          CollectionsSample.create(sample_id: sample_2.id, collection_id: 1)
          s = Sample.find_by(id: sample_3.id)
          expect(s).to_not be_nil
          delete '/api/v1/samples', { ui_state: params_all_false }
          s = Sample.find_by(id: sample_3.id)
          expect(s).to_not be_nil
          array = Sample.where(id: sample_ids).to_a
          expect(array).to match_array([])
          a = Well.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = CollectionsSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsProductSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
        end

        xit 'should be able to delete samples when "all" is false' do
          sample_ids = [sample_1.id, sample_2.id]
          array = Sample.where(id: sample_ids).to_a
          expect(array).to match_array([sample_1, sample_2])
          CollectionsSample.create(sample_id: sample_1.id, collection_id: 1)
          CollectionsSample.create(sample_id: sample_2.id, collection_id: 1)
          s = Sample.find_by(id: sample_3.id)
          expect(s).to_not be_nil
          delete '/api/v1/samples', { ui_state: params_all_true }
          s = Sample.find_by(id: sample_3.id)
          expect(s).to_not be_nil
          array = Sample.where(id: sample_ids).to_a
          expect(array).to match_array([])
          a = Well.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = CollectionsSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsProductSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(sample_id: sample_ids).to_a
          expect(a).to match_array([])
        end

      end

    end

    describe "subsamples" do
      context "with valid parameters" do
        let!(:c)      { create(:collection, user_id: user.id) }
        let!(:s1) { create(:sample, name: 's1', external_label: 'ext1') }
        let!(:s2) { create(:sample, name: 's2', external_label: 'ext2') }

        before do
          CollectionsSample.create!(sample_id: s1.id, collection_id: c.id)
          CollectionsSample.create!(sample_id: s2.id, collection_id: c.id)
        end

        let!(:params) {
          {
            ui_state: {
              sample: {
                all: true,
                included_ids: [],
                excluded_ids: []
              },
              currentCollectionId: c.id
            }
          }
        }
        describe 'POST /api/v1/samples/subsamples' do
          it 'should be able to split Samples into Subsamples' do
            post '/api/v1/samples/subsamples', params
            subsamples = Sample.where(name: ['s1','s2']).where.not(id: [s1.id,s2.id])
            s3 = subsamples[0]
            s4 = subsamples[1]
            except_attr = [
              "id", "created_at", "updated_at", "ancestry", "created_by",
              "short_label", "name", "external_label"
            ]
            s3.attributes.except(*except_attr).each do |k, v|
              expect(s1[k]).to eq(v)
            end
            expect(s3.name).to eq(s1.name)
            expect(s3.external_label).to eq(s1.external_label)
            expect(s3.short_label).to eq(s1.short_label + "-" + s1.children.count.to_s)

            s4.attributes.except(*except_attr).each do |k, v|
              expect(s2[k]).to eq(v)
            end
            expect(s4.name).to eq(s2.name)
            expect(s4.external_label).to eq(s2.external_label)
            expect(s4.short_label).to eq(s2.short_label + "-" + s2.children.count.to_s)

            expect(s1.id).to_not eq(s3.id)
            expect(s2.id).to_not eq(s4.id)
            expect(s3.parent).to eq(s1)
            expect(s4.parent).to eq(s2)
            expect(s3.creator).to eq(user)
            expect(s4.creator).to eq(user)
            collection_sample = CollectionsSample.where(sample_id: s3.id, collection_id: c.id)
            expect(collection_sample).to_not be_nil
            collection_sample = CollectionsSample.where(sample_id: s4.id, collection_id: c.id)
            expect(collection_sample).to_not be_nil
          end
        end
      end
    end

  end
end
