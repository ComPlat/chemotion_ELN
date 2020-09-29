# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SampleAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/samples/ui_state/' do
      context 'with appropriate permissions' do
        let(:c)        { create(:collection, user_id: user.id) }
        let(:sample_1) { create(:sample) }
        let(:sample_2) { create(:sample) }
        let(:limit)    { 1 }

        let(:params) do
          {
            ui_state: {
              all: false,
              included_ids: [sample_1.id, sample_2.id],
              excluded_ids: [],
              collection_id: c.id
            }
          }
        end

        let(:params_with_limit) do
          {
            ui_state: {
              all: false,
              included_ids: [sample_1.id, sample_2.id],
              excluded_ids: [],
              collection_id: c.id
            },
            limit: limit
          }
        end

        before do
          CollectionsSample.create!(sample: sample_1, collection: c)
          CollectionsSample.create!(sample: sample_2, collection: c)
        end

        describe 'limit param given' do
          before { post '/api/v1/samples/ui_state/', params_with_limit }

          it 'fetches less or equal than limit samples' do
            expect(JSON.parse(response.body)['samples'].size).to be <= limit
          end
        end

        describe 'limit param not given' do
          before { post '/api/v1/samples/ui_state/', params }

          it 'fetches all samples for given ui_state' do
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

        it 'returns correct can_publish & can_update' do
          expect(JSON.parse(response.body)['sample']['can_update']).to eq true
          expect(JSON.parse(response.body)['sample']['can_publish']).to eq true
        end
      end

      context 'with appropriate permissions & shared collections' do
        let!(:c_shared) { create(:collection, user_id: user.id, is_shared: true) }
        let!(:sample)   { create(:sample) }

        before do
          CollectionsSample.create!(sample: sample, collection: c_shared)
        end

        context 'permission_level = 0' do
          it 'returns correct can_publish & can_update' do
            c_shared.update_attributes(permission_level: 0)
            get "/api/v1/samples/#{sample.id}"
            expect(JSON.parse(response.body)['sample']['can_update']).to eq false
            expect(JSON.parse(response.body)['sample']['can_publish']).to eq false
          end
        end

        context 'permission_level = 1' do
          it 'returns correct can_publish & can_update' do
            c_shared.update_attributes(permission_level: 1)
            get "/api/v1/samples/#{sample.id}"
            expect(JSON.parse(response.body)['sample']['can_update']).to eq true
            expect(JSON.parse(response.body)['sample']['can_publish']).to eq false
          end
        end

        context 'permission_level = 3' do
          it 'returns correct can_publish & can_update' do
            c_shared.update_attributes(permission_level: 3)
            get "/api/v1/samples/#{sample.id}"
            expect(JSON.parse(response.body)['sample']['can_update']).to eq true
            expect(JSON.parse(response.body)['sample']['can_publish']).to eq true
          end
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
        let(:cas) { 'test_cas' }

        let(:params) do
          {
            name: 'updated name',
            target_amount_value: 0,
            target_amount_unit: 'g',
            molarity_value: nil,
            molarity_unit: 'M',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            location: '',
            molfile: '',
            is_top_secret: false,
            xref: { 'cas' => cas },
            container: {
              attachments: [],
              children: [],
              is_new: true,
              is_deleted: false,
              name: 'new'
            },
            boiling_point_upperbound: 100.0,
            boiling_point_lowerbound: nil,
            melting_point_upperbound: 121.5,
            melting_point_lowerbound: nil
          }
        end

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
            expect(s).not_to be_nil
            expect(s.target_amount_value).to eq 0
            expect(s.xref['cas']).to eq cas
          end
        end

        describe 'updating sample 2' do
          before { put "/api/v1/samples/#{s2.id}", params }

          it 'returns 200 status code' do
            expect(response.status).to eq 200
          end

          it 'updates sample' do
            s = Sample.find_by(name: 'updated name')
            expect(s).not_to be_nil
            expect(s.target_amount_value).to eq 0
            expect(s.xref['cas']).to eq cas
          end
        end
      end

      context 'with inappropriate permissions' do
        let(:c)      { create(:collection, user_id: user.id + 1) }
        let(:sample) { create(:sample) }
        let(:params) do
          {
            name: 'updated name',
            target_amount_value: 0,
            target_amount_unit: 'g',
            molarity_value: nil,
            molarity_unit: 'M',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            location: '',
            molfile: '',
            is_top_secret: false
          }
        end

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
      let!(:c) { create(:collection, user: user, is_shared: false) }
      let!(:s) { create(:sample, collections: [c]) }

      it 'returns serialized (unshared) samples roots of logged in user' do
        get '/api/v1/samples'
        first_sample = JSON.parse(response.body)['samples']
                           .first.symbolize_keys
        expect(first_sample).to include(
          id: s.id,
          name: s.name,
          type: 'sample'
        )
        expect(
          first_sample[:tag]['taggable_data']['collection_labels']
        ).to include(
          'name' => c.label,
          'is_shared' => false,
          'id' => c.id,
          'user_id' => user.id,
          'shared_by_id' => c.shared_by_id,
          'is_synchronized' => c.is_synchronized
        )
        expect(
          first_sample[:tag]['taggable_data']['analyses']
        ).to include('confirmed' => { 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' => 1 })
      end
    end

    describe 'POST /api/v1/samples' do
      context 'with valid parameters' do
        let(:cas) { 'test_cas' }
        let(:params) do
          {
            name: 'test',
            target_amount_value: 0,
            target_amount_unit: 'g',
            molarity_value: nil,
            molarity_unit: 'M',
            external_label: 'test extlabel',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            location: '',
            density: 0.5,
            boiling_point_upperbound: 100,
            boiling_point_lowerbound: 100,
            melting_point_upperbound: 200,
            melting_point_lowerbound: 200,
            molfile: File.read(Rails.root + 'spec/fixtures/test_2.mol'),
            is_top_secret: false,
            xref: { 'cas' => cas },
            container: {
              attachments: [],
              children: [],
              is_new: true,
              is_deleted: false,
              name: 'new'
            }
          }
        end

        before { post '/api/v1/samples', params }

        it 'is able to create a new sample' do
          s = Sample.find_by(name: 'test')
          expect(s).not_to be_nil

          # TODO: Correct?
          params.delete(:container)
          # end

          params.each do |k, v|
            expect(s.attributes.symbolize_keys[:boiling_point].first).to eq(v) if k.to_s == 'boiling_point_upperbound'
            expect(s.attributes.symbolize_keys[:boiling_point].last).to eq(v) if k.to_s == 'boiling_point_lowerbound'
            expect(s.attributes.symbolize_keys[:melting_point].first).to eq(v) if k.to_s == 'melting_point_upperbound'
            expect(s.attributes.symbolize_keys[:melting_point].last).to eq(v) if k.to_s == 'melting_point_lowerbound'
            expect(s.attributes.symbolize_keys[k]).to eq(v) unless k.to_s.include? 'bound'
          end
        end

        it 'sets the creator' do
          s = Sample.find_by(name: 'test')
          expect(s.creator).to eq(user)
        end
      end
    end

    describe 'DELETE /api/v1/samples' do
      context 'with valid parameters' do
        let(:c1) { create(:collection, user: user) }
        let(:s1) { create(:sample, name: 'test') }

        let!(:params) do
          {
            name: 'test',
            target_amount_value: 0,
            target_amount_unit: 'g',
            molarity_value: nil,
            molarity_unit: 'M',
            description: 'Test Sample',
            purity: 1,
            solvent: '',
            location: '',
            molfile: '',
            is_top_secret: false
          }
        end

        before do
          CollectionsSample.create!(collection: c1, sample: s1)
          delete "/api/v1/samples/#{s1.id}"
        end

        it 'is able to delete a sample' do
          s = Sample.find_by(name: 'test')
          expect(s).to be_nil
        end
      end

      context 'with UIState' do
        let!(:sample_1) { create(:sample, name: 'test_1') }
        let!(:sample_2) { create(:sample, name: 'test_2') }
        let!(:sample_3) { create(:sample, name: 'test_3') }

        let!(:params_all_false) do
          {
            all: false,
            included_ids: [sample_1.id, sample_2.id],
            excluded_ids: []
          }
        end

        let!(:params_all_true) do
          {
            all: true,
            included_ids: [],
            excluded_ids: [sample_3.id]
          }
        end

        xit 'should be able to delete samples when "all" is false' do
          sample_ids = [sample_1.id, sample_2.id]
          array = Sample.where(id: sample_ids).to_a
          expect(array).to match_array([sample_1, sample_2])
          CollectionsSample.create(sample_id: sample_1.id, collection_id: 1)
          CollectionsSample.create(sample_id: sample_2.id, collection_id: 1)
          s = Sample.find_by(id: sample_3.id)
          expect(s).not_to be_nil
          delete '/api/v1/samples', ui_state: params_all_false
          s = Sample.find_by(id: sample_3.id)
          expect(s).not_to be_nil
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
          expect(s).not_to be_nil
          delete '/api/v1/samples', ui_state: params_all_true
          s = Sample.find_by(id: sample_3.id)
          expect(s).not_to be_nil
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

    describe 'subsamples' do
      context 'with valid parameters' do
        let!(:c) { create(:collection, user_id: user.id) }
        let!(:s1) { create(:sample, name: 's1', external_label: 'ext1') }
        let!(:s2) { create(:sample, name: 's2', external_label: 'ext2') }

        before do
          CollectionsSample.create!(sample_id: s1.id, collection_id: c.id)
          CollectionsSample.create!(sample_id: s2.id, collection_id: c.id)
        end

        let!(:params) do
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
        end

        describe 'POST /api/v1/samples/subsamples' do
          it 'is able to split Samples into Subsamples' do
            post '/api/v1/samples/subsamples', params
            subsamples = Sample.where(name: %w[s1 s2]).where.not(id: [s1.id, s2.id])
            s3 = subsamples[0]
            s4 = subsamples[1]
            except_attr = %w[
              id created_at updated_at ancestry created_by
              short_label name external_label
            ]
            s3.attributes.except(*except_attr).each do |k, v|
              expect(s1[k]).to eq(v)
            end
            expect(s3.name).to eq(s1.name)
            expect(s3.external_label).to eq(s1.external_label)
            expect(s3.short_label).to eq(s1.short_label + '-' + s1.children.count.to_s)

            s4.attributes.except(*except_attr).each do |k, v|
              expect(s2[k]).to eq(v)
            end
            expect(s4.name).to eq(s2.name)
            expect(s4.external_label).to eq(s2.external_label)
            expect(s4.short_label).to eq(s2.short_label + '-' + s2.children.count.to_s)

            expect(s1.id).not_to eq(s3.id)
            expect(s2.id).not_to eq(s4.id)
            expect(s3.parent).to eq(s1)
            expect(s4.parent).to eq(s2)
            expect(s3.creator).to eq(user)
            expect(s4.creator).to eq(user)
            collection_sample = CollectionsSample.where(sample_id: s3.id, collection_id: c.id)
            expect(collection_sample).not_to be_nil
            collection_sample = CollectionsSample.where(sample_id: s4.id, collection_id: c.id)
            expect(collection_sample).not_to be_nil
          end
        end
      end
    end
  end
end
