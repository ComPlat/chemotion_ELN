# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers

require 'rails_helper'

describe Chemotion::SampleAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user_id: user.id) }
  let(:other_user_collection) { create(:collection, user_id: user.id + 1) }
  let(:personal_collection) { create(:collection, user: user, is_shared: false) }
  let(:shared_collection) { create(:collection, user_id: user.id, is_shared: true) }

  describe 'POST /api/v1/samples/ui_state/' do
    let(:sample_1) { create(:sample) }
    let(:sample_2) { create(:sample) }
    let(:limit)    { 1 }

    before do
      CollectionsSample.create!(sample: sample_1, collection: collection)
      CollectionsSample.create!(sample: sample_2, collection: collection)

      post '/api/v1/samples/ui_state/', params: params, as: :json
    end

    context 'when limit param given' do
      let(:params) do
        {
          ui_state: {
            all: false,
            included_ids: [sample_1.id, sample_2.id],
            excluded_ids: [],
            collection_id: collection.id,
          },
          limit: limit,
        }
      end

      it 'fetches less or equal than limit samples' do
        expect(JSON.parse(response.body)['samples'].size).to be <= limit
      end
    end

    context 'when limit param not given' do
      let(:params) do
        {
          ui_state: {
            all: false,
            included_ids: [sample_1.id, sample_2.id],
            excluded_ids: [],
            collection_id: collection.id,
          },
        }
      end

      it 'fetches all samples for given ui_state' do
        expect(JSON.parse(response.body)['samples'].size).to eq 2
      end
    end
  end

  describe 'POST /api/v1/samples/subsamples' do
    let(:s1) { create(:sample, name: 's1', external_label: 'ext1') }
    let(:s2) { create(:sample, name: 's2', external_label: 'ext2') }

    let(:params) do
      {
        ui_state: {
          sample: {
            all: true,
            included_ids: [],
            excluded_ids: [],
          },
          currentCollectionId: collection.id,
        },
      }
    end

    let(:subsamples) { Sample.where(name: %w[s1 s2]).where.not(id: [s1.id, s2.id]) }

    before do
      CollectionsSample.create!(sample: s1, collection: collection)
      CollectionsSample.create!(sample: s2, collection: collection)

      post '/api/v1/samples/subsamples', params: params, as: :json
    end

    # TODO: Cleanup this
    it 'is able to split Samples into Subsamples' do
      s3 = subsamples[0]
      s4 = subsamples[1]
      except_attr = %w[
        id created_at updated_at ancestry created_by
        short_label name external_label
      ]
      sample1_attributes = s1.attributes.except(*except_attr)
      subsample1_attributes = s3.attributes.except(*except_attr)
      expect(sample1_attributes).to eq(subsample1_attributes)

      expect(s3.name).to eq(s1.name)
      expect(s3.external_label).to eq(s1.external_label)
      expect(s3.short_label).to eq("#{s1.short_label}-#{s1.children.count}")

      sample2_attributes = s2.attributes.except(*except_attr)
      subsample2_attributes = s4.attributes.except(*except_attr)
      expect(sample2_attributes).to eq(subsample2_attributes)
      expect(s4.name).to eq(s2.name)
      expect(s4.external_label).to eq(s2.external_label)
      expect(s4.short_label).to eq("#{s2.short_label}-#{s2.children.count}")

      expect(s1.id).not_to eq(s3.id)
      expect(s2.id).not_to eq(s4.id)
      expect(s3.parent).to eq(s1)
      expect(s4.parent).to eq(s2)
      expect(s3.creator).to eq(user)
      expect(s4.creator).to eq(user)
      collection_sample = CollectionsSample.where(sample_id: s3.id, collection_id: collection.id)
      expect(collection_sample).not_to be_nil
      collection_sample = CollectionsSample.where(sample_id: s4.id, collection_id: collection.id)
      expect(collection_sample).not_to be_nil
    end
  end

  describe 'POST /api/v1/samples/import/' do
    before do
      post(
        '/api/v1/samples/import/',
        params: params,
        headers: {
          'HTTP_ACCEPT' => '*/*',
          'CONTENT_TYPE' => 'multipart/form-data',
        },
      )
    end

    context 'when import from a xlsx file' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          file: fixture_file_upload(Rails.root.join('spec/fixtures/import_sample_data.xlsx'),
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        }
      end

      it 'is able to import new samples' do
        ids_from_response = JSON.parse(response.body)['data']
        ids_from_db = Sample.pluck(:id)
        expect(ids_from_response).to match_array(ids_from_db)

        expect(JSON.parse(response.body)['data'].count).to eq 3
      end
    end

    context 'when import from a sdf file' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          file: fixture_file_upload(Rails.root.join('spec/fixtures/import_sample_data.sdf'), 'chemical/x-mdl-sdfile'),
        }
      end

      it 'is able to import new samples' do
        expect(
          JSON.parse(response.body)['message'],
        ).to eq "This file contains 2 Molecules.\n2 Molecules processed. "

        expect(JSON.parse(response.body)['sdf']).to be true

        expect(JSON.parse(response.body)['data'].count).to eq 2
      end
    end
  end

  describe 'POST /api/v1/samples/confirm_import/' do
    before do
      create(:molecule, inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N', is_partial: false)
      create(:molecule, inchikey: 'UGSFIVDHFJJCBJ-UHFFFAOYSA-M', is_partial: false)

      post '/api/v1/samples/confirm_import', params: params, as: :json
    end

    context 'when parameters are valid' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          mapped_keys: {
            description: %w[
              MOLECULE_NAME
              SAFETY_R_S
              SMILES_STEREO
            ],
            short_label: 'EMP_FORMULA_SHORT',
            target_amount: 'AMOUNT',
            real_amount: 'REAL_AMOUNT',
            density: 'DENSITY_20',
            decoupled: 'MOLECULE-LESS',
            molarity: 'MOLARITY',
            melting_point: 'melting_point',
            boiling_point: 'boiling_point',
            location: 'location',
            external_label: 'external_label',
            name: 'name',
          },
          rows: [{
            inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N',
            molfile: Rails.root.join('spec', 'fixtures', 'mf_with_data_01.sdf').read,
            description: "MOLECULE_NAME\n(R)-Methyl-2-amino-2-phenylacetate hydrochloride ?96%; (R)-(?)-2-Phenylglycine methyl ester hydrochloride\n\nSAFETY_R_S\nH: 319; P: 305+351+338\n\nSMILES_STEREO\n[Cl-].COC(=O)[C@H](N)c1ccccc1.[H+]\n",
            short_label: 'C9H12ClNO2',
            target_amount: '10 g /  g',
            real_amount: '15mg/mg',
            density: '30',
            decoupled: 'f',
            molarity: '900',
            melting_point: '900.0',
            boiling_point: '900.0-1500.0',
            location: 'location',
            external_label: 'external_label',
            name: 'name',
          }],
        }
      end

      it 'is able to create samples from an array of inchikeys' do
        expect(
          JSON.parse(response.body)['message'],
        ).to eq "This file contains 1 Molecules.\nCreated 1 sample. \nImport successful! "

        expect(
          JSON.parse(response.body)['sdf'],
        ).to be true

        expect(
          JSON.parse(response.body)['status'],
        ).to eq 'ok'

        collection_sample = CollectionsSample.where(collection_id: collection.id)

        molecule = Molecule.find_by(inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N')
        sample = Sample.find_by(molecule_id: molecule.id)

        expect(sample['target_amount_value']).to eq 10
        expect(sample['target_amount_unit']).to eq 'g'
        expect(sample['real_amount_value']).to eq 15
        expect(sample['real_amount_unit']).to eq 'mg'
        expect(sample['short_label']).to eq 'C9H12ClNO2'
        expect(sample['density']).to eq 30
        expect(sample['description']).to eq "MOLECULE_NAME\n(R)-Methyl-2-amino-2-phenylacetate hydrochloride ?96%; (R)-(?)-2-Phenylglycine methyl ester hydrochloride\n\nSAFETY_R_S\nH: 319; P: 305+351+338\n\nSMILES_STEREO\n[Cl-].COC(=O)[C@H](N)c1ccccc1.[H+]\n"
        expect(sample['location']).to eq 'location'
        expect(sample['external_label']).to eq 'external_label'
        expect(sample['name']).to eq 'name'
        expect(sample['molarity_value']).to eq 900

        expect(sample['boiling_point']).to eq 900.0..1500.0
        expect(sample['melting_point']).to eq 900.0...Float::INFINITY
      end
    end

    context 'when data type mapping is wrong' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          mapped_keys: {
            description: %w[
              MOLECULE_NAME
              SAFETY_R_S
              SMILES_STEREO
            ],
            short_label: 'EMP_FORMULA_SHORT',
            target_amount: 'AMOUNT',
            real_amount: 'REAL_AMOUNT',
            density: 'DENSITY_20',
            decoupled: 'MOLECULE-LESS',
          },
          rows: [{
            inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N',
            molfile: Rails.root.join('spec', 'fixtures', 'mf_with_data_01.sdf').read,
            description: "MOLECULE_NAME\n(R)-Methyl-2-amino-2-phenylacetate hydrochloride ?96%; (R)-(?)-2-Phenylglycine methyl ester hydrochloride\n\nSAFETY_R_S\nH: 319; P: 305+351+338\n\nSMILES_STEREO\n[Cl-].COC(=O)[C@H](N)c1ccccc1.[H+]\n",
            short_label: 'C9H12ClNO2',
            target_amount: 'Test data',
            real_amount: 'Test',
            density: 'Test',
            decoupled: 'f',
            molarity: '900sdadsad',
            melting_point: '900',
            boiling_point: '1000',
            location: 'location',
            external_label: 'external_label',
            name: 'name',
          }],
        }
      end

      it 'is able to import new samples' do
        expect(
          JSON.parse(response.body)['message'],
        ).to eq "This file contains 1 Molecules.\nCreated 1 sample. \nImport successful! "

        expect(
          JSON.parse(response.body)['sdf'],
        ).to be true

        expect(
          JSON.parse(response.body)['status'],
        ).to eq 'ok'

        collection_sample = CollectionsSample.where(collection_id: collection.id)

        molecule = Molecule.find_by(inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N')
        sample = Sample.find_by(molecule_id: molecule.id)

        expect(sample['target_amount_value']).to eq 0
        expect(sample['target_amount_unit']).to eq 'g'
        expect(sample['real_amount_value']).to eq 0
        expect(sample['real_amount_unit']).to eq 'g'
        expect(sample['short_label']).to eq 'C9H12ClNO2'
        expect(sample['density']).to eq 0
        expect(sample['description']).to eq "MOLECULE_NAME\n(R)-Methyl-2-amino-2-phenylacetate hydrochloride ?96%; (R)-(?)-2-Phenylglycine methyl ester hydrochloride\n\nSAFETY_R_S\nH: 319; P: 305+351+338\n\nSMILES_STEREO\n[Cl-].COC(=O)[C@H](N)c1ccccc1.[H+]\n"
        expect(sample['location']).to eq 'location'
        expect(sample['external_label']).to eq 'external_label'
        expect(sample['name']).to eq 'name'
        expect(sample['molarity_value']).to eq 900

        expect(sample['boiling_point']).to eq 1000.0...Float::INFINITY
        expect(sample['melting_point']).to eq 900.0...Float::INFINITY
      end
    end
  end

  describe 'GET /api/v1/samples' do
    context 'when no params given' do
      let!(:sample) { create(:sample, collections: [personal_collection]) }

      it 'returns serialized (unshared) samples roots of logged in user' do
        get '/api/v1/samples'

        first_sample = JSON.parse(response.body)['samples']
                           .first.symbolize_keys
        expect(first_sample).to include(
          id: sample.id,
          name: sample.name,
          type: 'sample',
        )
        expect(
          first_sample[:tag]['taggable_data']['collection_labels'],
        ).to include(
          'name' => personal_collection.label,
          'is_shared' => false,
          'id' => personal_collection.id,
          'user_id' => user.id,
          'shared_by_id' => personal_collection.shared_by_id,
          'is_synchronized' => personal_collection.is_synchronized,
        )
        expect(
          first_sample[:tag]['taggable_data']['analyses'],
        ).to include('confirmed' => { 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' => 1 })
      end
    end

    context 'when molecule_sort is enabled' do
      let!(:sample) { create(:sample, collections: [personal_collection]) }
      let!(:sample2) { create(:sample, collections: [personal_collection]) }

      it 'returns samples in the right order' do
        get '/api/v1/samples', params: { molecule_sort: 1 }
        expect(JSON.parse(response.body)['samples'].pluck('id')).to eq([sample.id, sample2.id])
      end
    end

    context 'when molecule_sort is disabled' do
      let!(:sample) { create(:sample, collections: [personal_collection]) }
      let!(:sample2) { create(:sample, collections: [personal_collection]) }

      it 'returns samples in the right order' do
        get '/api/v1/samples', params: { molecule_sort: 0 }
        expect(JSON.parse(response.body)['samples'].pluck('id')).to eq([sample2.id, sample.id])
      end
    end

    context 'when collection_id is given' do
      let!(:sample) { create(:sample, collections: [personal_collection]) }
      let!(:sample2) { create(:sample, collections: [personal_collection]) }

      it 'returns samples' do
        get '/api/v1/samples', params: { collection_id: personal_collection.id }
        expect(JSON.parse(response.body)['samples'].size).to eq(2)
      end
    end

    context 'when collection_id is given and no samples found' do
      it 'returns no samples' do
        allow(Collection).to receive(:belongs_to_or_shared_by).and_raise(ActiveRecord::RecordNotFound)
        get '/api/v1/samples', params: { collection_id: personal_collection.id }
        expect(JSON.parse(response.body)['samples'].size).to eq(0)
      end
    end

    context 'when filtered by created at with from_date and to_date' do
      let(:time) { Time.current }
      let(:sample1) { create(:sample, created_at: time, collections: [personal_collection]) }
      let(:sample2) { create(:sample, created_at: time.end_of_day, collections: [personal_collection]) }
      let(:sample3) { create(:sample, created_at: time.beginning_of_day, collections: [personal_collection]) }
      let(:sample4) { create(:sample, created_at: 1.day.from_now.end_of_day, collections: [personal_collection]) }
      let(:sample5) { create(:sample, created_at: 1.day.from_now.beginning_of_day, collections: [personal_collection]) }
      let(:sample6) { create(:sample, created_at: 1.day.ago.beginning_of_day, collections: [personal_collection]) }

      it 'returns samples in range' do
        sample1
        sample2
        sample3
        sample4
        sample5
        sample6

        get '/api/v1/samples', params: {
          collection_id: personal_collection.id,
          filter_created_at: true,
          from_date: time.to_i,
          to_date: time.to_i,
        }

        expect(JSON.parse(response.body)['samples'].pluck('id').sort).to eq(
          [
            sample1.id,
            sample2.id,
            # sample3.id, should have been included
            sample5.id, # should have been excluded
          ],
        )
      end
    end
  end

  describe 'GET /api/v1/samples/:id' do
    let(:sample) { create(:sample) }

    before do
      CollectionsSample.create!(sample: sample, collection: collection)
    end

    context 'when permissions are appropriate' do
      before do
        get "/api/v1/samples/#{sample.id}"
      end

      it 'returns 200 status code' do
        expect(response).to have_http_status :ok
      end

      it 'returns serialized sample' do
        expect(JSON.parse(response.body)['sample']['name']).to eq sample.name
      end

      it 'returns correct can_publish & can_update' do
        expect(JSON.parse(response.body)['sample']['can_update']).to be true
        expect(JSON.parse(response.body)['sample']['can_publish']).to be true
      end
    end

    context 'when permissions are appropriate & shared collections' do
      let(:collection) { shared_collection }

      before do
        collection.update(permission_level: permission_level)
        get "/api/v1/samples/#{sample.id}"
      end

      context 'when permission_level = 0' do
        let(:permission_level) { 0 }

        it 'returns correct can_publish & can_update' do
          expect(JSON.parse(response.body)['sample']['can_update']).to be false
          expect(JSON.parse(response.body)['sample']['can_publish']).to be false
        end
      end

      context 'when permission_level = 1' do
        let(:permission_level) { 1 }

        it 'returns correct can_publish & can_update' do
          expect(JSON.parse(response.body)['sample']['can_update']).to be true
          expect(JSON.parse(response.body)['sample']['can_publish']).to be false
        end
      end

      context 'when permission_level = 3' do
        let(:permission_level) { 3 }

        it 'returns correct can_publish & can_update' do
          expect(JSON.parse(response.body)['sample']['can_update']).to be true
          expect(JSON.parse(response.body)['sample']['can_publish']).to be true
        end
      end
    end

    context 'when permissions are inappropriate' do
      let(:collection) { other_user_collection }

      it 'returns 401 unauthorized status code' do
        get "/api/v1/samples/#{sample.id}"
        expect(response).to have_http_status :unauthorized
      end
    end
  end

  describe 'GET /api/v1/samples/fetchByShortLabel/:shortLabel' do
    let(:sample) { create(:sample, short_label: 'FOOBAR', creator: user, collections: [collection]) }
    let(:short_label) { 'FOOBAR' }
    let(:expected_response) do
      {
        'sample_id' => sample.id,
        'collection_id' => collection.id,
      }
    end

    before do
      sample
    end

    it 'returns the sample_id and the collection_id' do
      get "/api/v1/samples/findByShortLabel/#{short_label}.json"

      expect(parsed_json_response).to eq(expected_response)
    end
  end

  describe 'PUT /api/v1/samples/:id' do
    let(:sample) { create(:sample) }

    context 'when permissions are appropriate' do
      let(:c1) { collection }
      let(:c2) { other_user_collection }
      let(:c3) { create(:collection, user_id: user.id, is_shared: true, permission_level: 1) }
      let(:s1) { create(:sample, name: 'old', target_amount_value: 0.1) }
      let(:s2) { create(:sample, name: 'old2', target_amount_value: 0.2) }
      let(:cas) { '58-08-2' }

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
            name: 'new',
          },
          boiling_point_upperbound: 100.0,
          boiling_point_lowerbound: nil,
          melting_point_upperbound: 121.5,
          melting_point_lowerbound: nil,
        }
      end

      before do
        CollectionsSample.create!(sample: s1, collection: c1)
        CollectionsSample.create!(sample: s1, collection: c2)
        CollectionsSample.create!(sample: s2, collection: c3)
        put "/api/v1/samples/#{sample.id}", params: params, as: :json
      end

      context 'when updating sample 1' do
        let(:sample) { s1 }

        it 'returns 200 status code' do
          expect(response).to have_http_status :ok
        end

        it 'updates sample' do
          s = Sample.find_by(name: 'updated name')
          expect(s).not_to be_nil
          expect(s.target_amount_value).to eq 0
          expect(s.xref['cas']).to eq cas
        end
      end

      context 'when updating sample 2' do
        let(:sample) { s2 }

        it 'returns 200 status code' do
          expect(response).to have_http_status :ok
        end

        it 'updates sample' do
          s = Sample.find_by(name: 'updated name')
          expect(s).not_to be_nil
          expect(s.target_amount_value).to eq 0
          expect(s.xref['cas']).to eq cas
        end
      end
    end

    context 'when permissions are inappropriate' do
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
        }
      end

      it 'returns 401 unauthorized status code' do
        CollectionsSample.create!(sample: sample, collection: other_user_collection)

        put "/api/v1/samples/#{sample.id}", params: params
        expect(response).to have_http_status :unauthorized
      end
    end
  end

  describe 'POST /api/v1/samples' do
    let(:cas) { '58-08-2' }
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
        solvent: nil,
        location: '',
        density: 0.5,
        boiling_point_upperbound: 100,
        boiling_point_lowerbound: 100,
        melting_point_upperbound: 200,
        melting_point_lowerbound: 200,
        molfile: File.read("#{Rails.root}/spec/fixtures/test_2.mol"),
        is_top_secret: false,
        xref: { 'cas' => cas },
        container: {
          attachments: [],
          children: [],
          is_new: true,
          is_deleted: false,
          name: 'new',
        },
        collection_id: user.collections[1][:id],
      }
    end

    before { post '/api/v1/samples', params: params, as: :json }

    it 'is able to create a new sample' do
      s = Sample.find_by(name: 'test')
      expect(s).not_to be_nil

      # TODO: Correct?
      params.delete(:container)
      params.delete(:solvent)
      # end

      params.each do |k, v|
        expect(s.attributes.symbolize_keys[:boiling_point].first).to eq(v) if k.to_s == 'boiling_point_upperbound'
        expect(s.attributes.symbolize_keys[:boiling_point].last).to eq(v) if k.to_s == 'boiling_point_lowerbound'
        expect(s.attributes.symbolize_keys[:melting_point].first).to eq(v) if k.to_s == 'melting_point_upperbound'
        expect(s.attributes.symbolize_keys[:melting_point].last).to eq(v) if k.to_s == 'melting_point_lowerbound'
        unless k.to_s.include?('bound') || k.to_s.include?('collection_id')
          expect(s.attributes.symbolize_keys[k]).to eq(v)
        end
      end

      expect(s.attributes.symbolize_keys[:solvent]).to eq([])
    end

    it 'sets the creator' do
      s = Sample.find_by(name: 'test')
      expect(s.creator).to eq(user)
    end
  end

  describe 'DELETE /api/v1/samples' do
    context 'when parameters are valid' do
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
          is_top_secret: false,
        }
      end

      before do
        CollectionsSample.create!(collection: collection, sample: s1)
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
          excluded_ids: [],
        }
      end

      let!(:params_all_true) do
        {
          all: true,
          included_ids: [],
          excluded_ids: [sample_3.id],
        }
      end

      # NB: deprecated api
      xit 'should be able to delete samples when "all" is false' do
        sample_ids = [sample_1.id, sample_2.id]
        array = Sample.where(id: sample_ids).to_a
        expect(array).to match_array([sample_1, sample_2])
        CollectionsSample.create(sample_id: sample_1.id, collection_id: 1)
        CollectionsSample.create(sample_id: sample_2.id, collection_id: 1)
        s = Sample.find_by(id: sample_3.id)
        expect(s).not_to be_nil
        delete '/api/v1/samples', params: { ui_state: params_all_false }, as: :json
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

      xit 'should be able to delete samples when "all" is true' do
        sample_ids = [sample_1.id, sample_2.id]
        array = Sample.where(id: sample_ids).to_a
        expect(array).to match_array([sample_1, sample_2])
        CollectionsSample.create(sample_id: sample_1.id, collection_id: 1)
        CollectionsSample.create(sample_id: sample_2.id, collection_id: 1)
        s = Sample.find_by(id: sample_3.id)
        expect(s).not_to be_nil
        delete '/api/v1/samples', params: { ui_state: params_all_true }, as: :json
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

  # TODO: Check these specs and remove everything that is already covered by the specs above
  #       Refactor the rest to match the spec structure as shown above
  context 'legacy specs previously contained in spec/api/attachment_api_spec.rb' do
    let(:u1) { create(:person, first_name: 'Person', last_name: 'Test') }
    let(:c1) { create(:collection, user_id: u1.id) }
    let!(:cont_s1_root) { create(:container) }
    let!(:s1) do
      create(:sample_without_analysis, name: 'sample 1', container: cont_s1_root)
    end
    let!(:cont_s1_analyses) { create(:container, container_type: 'analyses') }
    let!(:cont_s1_analysis) { create(:analysis_container) }
    # let!(:cont_s1_dataset)  { create(:container, container_type: 'dataset') }

    let(:u2) { create(:user) }
    let(:c2) { create(:collection, user_id: u2.id) }
    # let(:c12) {
    #  create(:collection, user_id: u1.id, is_shared: true, permission_level: 1)
    # }
    let!(:cont_s2_root) { create(:container) }
    let!(:s2) do
      create(:sample_without_analysis, name: 'sample 2', container: cont_s2_root)
    end
    let!(:cont_s2_analyses) { create(:container, container_type: 'analyses') }
    let!(:cont_s2_analysis) { create(:analysis_container) }
    let!(:cont_s2_dataset) { create(:container, container_type: 'dataset') }

    let!(:attachment) do
      create(
        :attachment,
        storage: 'tmp', key: '8580a8d0-4b83-11e7-afc4-85a98b9d0194',
        filename: 'upload.jpg',
        file_path: Rails.root.join('spec/fixtures/upload.jpg'),
        created_by: u1.id, created_for: u1.id
      )
    end

    let(:sample_upd_1_params) do
      JSON.parse(
        Rails.root.join('spec', 'fixtures', 'sample_update_1_params.json').read,
      ).deep_symbolize_keys
    end

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(u1)
      CollectionsSample.create!(sample: s1, collection: c1)

      cont_s1_root.children << cont_s1_analyses
      cont_s1_root.save!
      cont_s1_analyses.children << cont_s1_analysis
      cont_s1_analyses.save!
      # cont_s1_analysis.children << cont_s1_dataset
      # cont_s1_analysis.save
      s1.save

      sample_upd_1_params[:id] = s1.id
      sample_upd_1_params[:container][:id] = s1.container.id
      sample_upd_1_params[:container][:children][0][:id] =
        s1.container.children[0].id
      sample_upd_1_params[:container][:children][0][:children][0][:id] =
        s1.container.children[0].children[0].id
    end

    context 'upload file and update sample analysis' do
      context 'with appropriate permissions' do
        describe 'update sample analysis with a new dataset and a new img file' do
          before do
            attachment = Attachment.find_by(filename: 'upload.jpg')
            attachment.attachable = nil
            attachment.save!
            put("/api/v1/samples/#{s1.id}.json",
                params: sample_upd_1_params.to_json,
                headers: { 'CONTENT_TYPE' => 'application/json' })
          end

          it 'returns 200 status code' do
            expect(response).to have_http_status :ok
          end

          it 'has updated the analysis description' do
            expect(s1.analyses.first.description).to eq('updated description')
          end

          it 'has created a dataset for the corresponding analysis' do
            expect(cont_s1_analysis.children.count).to eq(1)
            # expect { put("/api/v1/samples/#{s1.id}.json", sample_upd_1_params) }
            #   .to change { s1.analyses.first.children.count }.by 1
          end

          it 'has created an attachment for the new dataset' do
            expect(Attachment.count).to eq(1)
            expect(
              s1.analyses.first.children.first.attachments.first,
            ).to eq(attachment)
          end

          it 'has stored the file' do
            expect(
              File.exist?(s1.analyses.first.children.first.attachments.first.abs_path),
            ).to be true
          end
        end
      end

      context 'with inappropriate permissions' do
        before do
          CollectionsSample.create!(sample: s2, collection: c2)
          cont_s2_root.children << cont_s2_analyses
          cont_s2_root.save!
          cont_s2_analyses.children << cont_s2_analysis
          cont_s2_analyses.save!
          cont_s2_analysis.children << cont_s2_dataset
          cont_s2_analysis.save
          s2.save
        end

        describe 'update samp analysis with a foreign analysis w a new file' do
          before do
            sample_upd_1_params[:container][:children][0][:id] =
              s2.container.children[0].id
            # sample_upd_1_params[:container][:children][0][:children][0][:id] =
            #  s2.container.children[0].children[0].id
            put("/api/v1/samples/#{s1.id}.json",
                params: sample_upd_1_params.to_json,
                headers: { 'CONTENT_TYPE' => 'application/json' })
          end

          it 'returns 200 status code' do
            expect(response).to have_http_status :ok
          end

          it 'has not created a dataset for the corresponding analysis' do
            expect(cont_s2_analysis.children.count).to eq(1)
            expect do
              put("/api/v1/samples/#{s1.id}.json",
                  params: sample_upd_1_params.to_json,
                  headers: { 'CONTENT_TYPE' => 'application/json' })
            end.not_to change { s2.analyses.first.children.count }
          end
        end
      end
    end
  end
end

# rubocop:enable RSpec/MultipleMemoizedHelpers
