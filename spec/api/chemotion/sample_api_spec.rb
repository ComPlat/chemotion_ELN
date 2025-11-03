# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers

require 'rails_helper'

describe Chemotion::SampleAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_user_collection) { create(:collection, user: other_user) }
  let(:personal_collection) { create(:collection, user: user) }
  let(:shared_collection) do
    create(:collection, user: other_user).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, permission_level: permission_level)
    end
  end

  describe 'POST /api/v1/samples/ui_state/' do
    let(:sample_1) { create(:sample, collections: [collection]) }
    let(:sample_2) { create(:sample, collections: [collection]) }
    let(:limit)    { 1 }

    before do
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
    let(:s1) { create(:sample, name: 's1', external_label: 'ext1', collections: [collection]) }
    let(:s2) { create(:sample, name: 's2', external_label: 'ext2', collections: [collection]) }

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
      s1
      s2
      post '/api/v1/samples/subsamples', params: params, as: :json
      expect(response.status).to eq 201
    end

    # TODO: Cleanup this
    it 'is able to split Samples into Subsamples' do
      s3 = subsamples[0]
      s4 = subsamples[1]
      except_attr = %w[
        id created_at updated_at ancestry created_by
        short_label name external_label xref
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
          import_type: 'sample',
        }
      end

      it 'is able to import new samples' do
        # Endpoint now returns async job status
        response_data = JSON.parse(response.body)
        expect(response_data['status']).to eq 'in progress'
        expect(response_data['message']).to eq 'Importing samples in the background'

        # Execute the enqueued job
        perform_enqueued_jobs

        # Verify samples were created
        expect(Sample.count).to eq 3
      end
    end

    context 'when import from a sdf file' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          file: fixture_file_upload(Rails.root.join('spec/fixtures/import_sample_data.sdf'), 'chemical/x-mdl-sdfile'),
          import_type: 'sample',
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

    context 'when import from client-validated data' do
      let(:data_array) do
        [
          {
            'name' => 'Test Sample',
            'external_label' => 'EXT-123',
            'target_amount_value' => '10',
            'target_amount_unit' => 'g',
            'density' => '1.2 g/ml',
            'molarity' => '3 M',
            'flash_point' => '23 °C',
            'decoupled' => 'false',
            'is_top_secret' => 'false',
            'dry_solvent' => 'false',
            'solvent' => '',
            'location' => 'Lab Room 42',
            'molecular_mass' => '194.19',
            'sum_formula' => 'C8H8',
            canonical_smiles: 'C12C3C4C2C2C1C3C42',
          },
        ]
      end

      let(:params) do
        {
          'currentCollectionId' => collection.id,
          'data' => data_array.to_json,
          'import_type' => 'sample',
          originalFormat: 'json',
        }
      end

      it 'returns a successful response with status 201' do
        expect(response.status).to eq 201
      end

      it 'returns a valid response with status ok and non-empty data' do
        response_data = JSON.parse(response.body)
        expect(response_data['status']).to eq 'in progress'
        expect(response_data['message']).to eq 'Importing samples in the background'

        # Execute the job and verify samples were created
        perform_enqueued_jobs
        expect(Sample.count).to be > 0
      end

      it 'creates the expected number of samples in the database' do
        perform_enqueued_jobs
        expect(Sample.count).to eq data_array.length
      end

      it 'creates samples with correct details' do
        perform_enqueued_jobs
        sample = Sample.first

        expect(sample.name).to eq data_array.first['name']
        expect(sample.external_label).to eq data_array.first['external_label']
      end

      it 'creates samples with correct numeric values' do
        perform_enqueued_jobs
        sample = Sample.first

        expect(sample.target_amount_value).to eq data_array.first['target_amount_value'].to_f
        expect(sample.target_amount_unit).to eq data_array.first['target_amount_unit']
      end
    end

    context 'when import from client-validated chemical data' do
      let(:chemical_data_array) do
        [
          {
            'name' => 'Cubane',
            'external_label' => 'CHEM-001',
            'target_amount_value' => '0',
            'target_amount_unit' => 'g',
            'density' => '4.0 g/ml',
            'molarity' => '3 M',
            'flash_point' => '23 °C',
            'decoupled' => 'false',
            'is_top_secret' => 'false',
            'dry_solvent' => 'false',
            'solvent' => '',
            'location' => 'chemicals room',
            'molecular_mass' => '194.19',
            'sum_formula' => 'C8H8',
            'cas' => '277-10-1',
            'status' => 'To be ordered',
            'vendor' => 'Merck',
            'order_number' => 'O6582233N2',
            'volume' => '1 ml',
            'amount' => '1 mg',
            'price' => '150',
            'person' => 'ML',
            'required_date' => '2023-05-15',
            'expiration_date' => '2050-01-01',
            'ordered_date' => '2023-05-19',
            'required_by' => 'Simone',
            'pictograms' => 'GHS07',
            'h_statements' => 'H302',
            'p_statements' => 'P264-P270-P301-P312-P501',
            'host_building' => '1',
            'host_room' => '2',
            'host_cabinet' => 'cabinet 3',
            'host_group' => 'Schumacher',
            'owner' => 'Olivier',
            'storage_temperature' => '25 °C',
            canonical_smiles: 'C12C3C4C2C2C1C3C42',
          },
        ]
      end

      let(:params) do
        {
          'currentCollectionId' => collection.id,
          'data' => chemical_data_array.to_json,
          'originalFormat' => 'json',
          'import_type' => 'chemical',
        }
      end

      it 'returns a successful response with status 201' do
        expect(response.status).to eq 201
      end

      it 'returns a valid response with status ok and non-empty data' do
        response_data = JSON.parse(response.body)
        expect(response_data['status']).to eq 'in progress'
        expect(response_data['message']).to eq 'Importing samples in the background'

        # Execute the job and verify samples were created
        perform_enqueued_jobs
        expect(Sample.count).to be > 0
      end

      it 'creates the expected number of samples in the database' do
        perform_enqueued_jobs
        expect(Sample.count).to eq chemical_data_array.length
      end

      it 'creates chemical samples with correct details' do
        perform_enqueued_jobs
        sample = Sample.first

        expect(sample.name).to eq chemical_data_array.first['name']
      end

      it 'correctly stores chemical-specific data' do
        perform_enqueued_jobs
        sample = Sample.first

        expect(sample.xref['cas']).to eq chemical_data_array.first['cas']
      end
    end

    context 'when import data is malformed' do
      let(:params) do
        {
          currentCollectionId: collection.id,
          'data' => 'invalid json string',
          'originalFormat' => 'json',
          'import_type' => 'sample',
        }
      end

      it 'returns an error' do
        # Grape's JSON type validator should reject invalid JSON
        # or the after_validation block should catch it
        expect(response.status).to be >= 400
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
            molfile: build(:molfile, type: 'mf_with_data_01'),
            description: "MOLECULE_NAME\n(R)-Methyl-2-amino-2-phenylacetate hydrochloride ?96%; (R)-(?)-2-Phenylglycine methyl ester hydrochloride\n\nSAFETY_R_S\nH: 319; P: 305+351+338\n\nSMILES_STEREO\n[Cl-].COC(=O)[C@H](N)c1ccccc1.[H+]\n",
            short_label: 'C9H12ClNO2',
            target_amount: '10 g /  g',
            real_amount: '15mg/mg',
            density: '30 g/mL',
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
        expect(sample['molarity_value']).to eq 0.0

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
            molfile: build(:molfile, type: 'mf_with_data_01'),
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
        expect(sample['molarity_value']).to eq 0.0

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
        ).to include('id' => personal_collection.id)

        expect(
          first_sample[:tag]['taggable_data']['analyses'],
        ).to include('confirmed' => { 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' => 1 })
      end
    end

    context 'with molecule_sort' do
      let(:molecules) { create_list(:molecule, 2) { |m, i| m.sum_formular = "C#{i}" } }
      let(:samples) { create_list(:sample, 2, collections: [personal_collection]) { |s, i| s.molecule = molecules[i] } }

      it 'returns samples in the right order' do
        sample_ids = samples.map(&:id)
        # ascending order of C with molecule_sort enabled
        get '/api/v1/samples', params: { molecule_sort: 1 }
        expect(JSON.parse(response.body)['samples'].pluck('id')).to eq(sample_ids)
        # descending order of sample.updated_at with molecule_sort disabled
        get '/api/v1/samples', params: { molecule_sort: 0 }
        expect(JSON.parse(response.body)['samples'].pluck('id')).to eq(sample_ids.reverse)
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
      let(:empty_collection) { create(:collection, label: 'empty collection', user: user) }
      before do
        empty_collection
      end

      it 'returns no samples' do
        get '/api/v1/samples', params: { collection_id: empty_collection.id }
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
    let(:sample) { create(:sample, collections: [collection]) }

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
    let(:expected_response) do
      {
        'sample_id' => sample.id,
        'collection_id' => collection.id,
      }
    end

    it 'returns the sample_id and the collection_id' do
      get "/api/v1/samples/findByShortLabel/#{sample.short_label}.json"

      expect(parsed_json_response).to eq(expected_response)
    end
  end

  describe 'PUT /api/v1/samples/:id' do
    context 'when permissions are appropriate' do
      let(:collection_shared_with_user) do
        create(:collection, user: other_user).tao do |collection|
          create(:collection_share, collection: collection, shared_with: user, permission_level: 1)
        end
      end
      let(:sample1) { create(:sample, name: 'old', target_amount_value: 0.1, collections: [collection]) }
      let(:sample2) do
        create(
          :sample,
          name: 'old2',
          target_amount_value: 0.2,
          collections: [other_user_collection, collection_shared_with_user]
        )
      end
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
        put "/api/v1/samples/#{sample1.id}", params: params, as: :json
      end

      context 'when updating sample 1' do
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

      context 'when updating sample inventory label' do
        let(:sample1) { create(:sample_with_valid_inventory_label, collections: [collection]) }
        let(:params) do
          {
            name: 'updated inventory sample',
            xref: { 'inventory_label' => 'prefix-1' },
            container: {
              attachments: [],
              children: [],
              is_new: true,
              is_deleted: false,
              name: 'new',
            },
            location: '',
            molfile: '',
            collection_id: collection.id,
          }
        end

        before do
          put "/api/v1/samples/#{sample1.id}", params: params, as: :json
        end

        it 'returns 200 status code' do
          expect(response).to have_http_status :ok
        end

        it 'sample inventory label matches the prefix-counter of the collection' do
          sample = Sample.find_by(id: sample1.id)
          expected_label = expected_inventory_label(collection)
          expect(sample.xref['inventory_label']).to eq expected_label
        end

        def expected_inventory_label(inventory_collection)
          inventory = Inventory.find_by(id: collection.inventory_id)
          "#{inventory['prefix']}-#{inventory['counter']}"
        end
      end

      context 'when updating sample 2' do
        let(:sample) { sample2 }

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
      let(:other_users_sample) { create(:sample, collections: [other_user_collection])}
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
        put "/api/v1/samples/#{other_users_sample.id}", params: params
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
        molfile: build(:molfile, type: 'test_2'),
        is_top_secret: false,
        dry_solvent: true,
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

    context 'with dry solvent' do
      let(:sample) { Sample.find_by(name: 'test') }

      it 'correctly sets the dry_solvent field' do
        expect(sample.dry_solvent).to be(true)
      end

      it 'can be set to false' do
        sample.dry_solvent = false
        expect(sample.dry_solvent).to be(false)
      end
    end
  end

  describe 'DELETE /api/v1/samples' do
    context 'when parameters are valid' do
      let(:s1) { create(:sample, name: 'test', collections: [collection]) }

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
        delete "/api/v1/samples/#{s1.id}"
      end

      it 'is able to delete a sample' do
        s = Sample.find_by(name: 'test')
        expect(s).to be_nil
      end
    end
  end

  # TODO: Check these specs and remove everything that is already covered by the specs above
  #       Refactor the rest to match the spec structure as shown above
  context 'legacy specs previously contained in spec/api/attachment_api_spec.rb' do
    let(:u1) { create(:person, first_name: 'Person', last_name: 'Test') }
    let(:c1) { create(:collection, user: u1) }
    let!(:cont_s1_root) { create(:container) }
    let!(:s1) do
      create(:sample_without_analysis, name: 'sample 1', container: cont_s1_root, collections: [c1])
    end
    let!(:cont_s1_analyses) { create(:container, container_type: 'analyses') }
    let!(:cont_s1_analysis) { create(:analysis_container) }
    # let!(:cont_s1_dataset)  { create(:container, container_type: 'dataset') }

    let(:u2) { create(:user) }
    let(:c2) { create(:collection, user_id: u2.id) }
    let!(:cont_s2_root) { create(:container) }
    let!(:s2) do
      create(:sample_without_analysis, name: 'sample 2', container: cont_s2_root, collections: [c2])
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

  describe 'POST /api/v1/samples/batch-refresh-svg' do
    def molfile1
      @molfile1 ||= build(:molfile, type: :water)
    end

    def molfile2
      @molfile2 ||= build(:molfile, type: :cubane)
    end

    def svg_filename1
      @svg_filename1 ||= "batch_refresh_svg_spec_1_#{SecureRandom.hex(8)}.svg"
    end

    def svg_filename2
      @svg_filename2 ||= "batch_refresh_svg_spec_2_#{SecureRandom.hex(8)}.svg"
    end

    def svg_path1
      "/images/samples/#{svg_filename1}"
    end

    def svg_path2
      "/images/samples/#{svg_filename2}"
    end

    def target_path1
      Rails.public_path.join('images', 'samples', svg_filename1)
    end

    def target_path2
      Rails.public_path.join('images', 'samples', svg_filename2)
    end

    def post_refresh_svg_batch(svgs)
      post '/api/v1/samples/batch-refresh-svg',
           params: { svgs: svgs }.to_json,
           headers: { 'Content-Type' => 'application/json' }
    end

    after do
      FileUtils.rm_f(target_path1) if target_path1 && File.exist?(target_path1)
      FileUtils.rm_f(target_path2) if target_path2 && File.exist?(target_path2)
    end

    context 'when svgs array is empty' do
      it 'returns 400' do
        post_refresh_svg_batch([])
        expect(response).to have_http_status(400)
        expect(JSON.parse(response.body)).to eq('svgs array is required and cannot be empty.')
      end
    end

    context 'when parameters are missing' do
      it 'returns results with success: false for missing molfile', :aggregate_failures do
        svgs = [{ svg_path: svg_path1, molfile: '' }]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(1)
        expect(results[0]['success']).to be false
        expect(results[0]['error']).to eq('svg_path and molfile are required')
      end

      it 'returns results with success: false for missing svg_path', :aggregate_failures do
        svgs = [{ svg_path: '', molfile: molfile1 }]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(1)
        expect(results[0]['success']).to be false
        expect(results[0]['error']).to eq('svg_path and molfile are required')
      end

      it 'handles string keys in params' do
        svgs = [{ 'svg_path' => svg_path1, 'molfile' => molfile1 }]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(1)
      end
    end

    context 'when filename is invalid (path traversal)' do
      it 'returns success: false for invalid filenames', :aggregate_failures do
        svgs = [
          { svg_path: '/images/samples/sub/..', molfile: molfile1 },
          { svg_path: 'folder\\name.svg', molfile: molfile2 },
        ]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(2)
        expect(results[0]['success']).to be false
        expect(results[0]['error']).to eq('Invalid filename')
        expect(results[1]['success']).to be false
        expect(results[1]['error']).to eq('Invalid filename')
      end
    end

    context 'when Molecule.svg_reprocess returns blank' do
      it 'returns success: false', :aggregate_failures do
        allow(Molecule).to receive(:svg_reprocess).and_return(nil)

        svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(1)
        expect(results[0]['success']).to be false
        expect(results[0]['error']).to eq('Failed to generate SVG from molfile')
      end
    end

    context 'with valid parameters and mocked Molecule.svg_reprocess' do
      def mock_svg_content
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      end

      before do
        allow(Molecule).to receive(:svg_reprocess).and_return(mock_svg_content)
      end

      it 'returns 200 with results array containing success: true for valid SVGs', :aggregate_failures do
        svgs = [
          { svg_path: svg_path1, molfile: molfile1 },
          { svg_path: svg_path2, molfile: molfile2 },
        ]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(2)
        expect(results[0]['success']).to be true
        expect(results[0]['filename']).to eq(svg_filename1)
        expect(results[1]['success']).to be true
        expect(results[1]['filename']).to eq(svg_filename2)
        expect(File).to exist(target_path1)
        expect(File).to exist(target_path2)
      end

      it 'handles partial failures when svg_reprocess returns nil for second', :aggregate_failures do
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile1).and_return(mock_svg_content)
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile2).and_return(nil)

        svgs = [
          { svg_path: svg_path1, molfile: molfile1 },
          { svg_path: svg_path2, molfile: molfile2 },
        ]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(2)
        expect(results[0]['success']).to be true
        expect(results[0]['filename']).to eq(svg_filename1)
        expect(results[1]['success']).to be false
        expect(results[1]['error']).to eq('Failed to generate SVG from molfile')
        expect(File).to exist(target_path1)
      end

      it 'handles single SVG correctly', :aggregate_failures do
        svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
        post_refresh_svg_batch(svgs)
        expect(response).to have_http_status(200)
        results = JSON.parse(response.body)['results']
        expect(results.length).to eq(1)
        expect(results[0]['success']).to be true
        expect(results[0]['filename']).to eq(svg_filename1)
      end
    end
  end
end

# rubocop:enable RSpec/MultipleMemoizedHelpers
